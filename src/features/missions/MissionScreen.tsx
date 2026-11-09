import { useEffect, useMemo, useRef, useState } from 'react';
import { navigate } from '@/app/router';
import { KidButton } from '@/components/KidButton';
import { Page } from '@/components/Page';
import { Topology } from '@/core/sim';
import { EditorView } from '@/features/editor/EditorView';
import { useEditor } from '@/features/editor/editorStore';
import { MISSIONS, missionById, missionStars } from '@/game/missions/catalogue';
import { unlockedFeatures } from '@/game/features';
import { useLevel, useProgress } from '@/game/progressStore';
import { isMissionUnlocked } from '@/game/unlocks';
import { playSound } from '@/services/audio/sfx';
import { burstConfetti } from '@/services/effects/confetti';
import { GoalCard } from './GoalCard';
import { MissionComplete } from './MissionComplete';

/** Pause before the "mission complete" card, so results can be read first. */
const READ_RESULT_MS = 1500;
const READ_COMMAND_MS = 4000;

export function MissionScreen({ missionId }: { missionId: string }) {
  const mission = missionById(missionId);
  const index = MISSIONS.findIndex((m) => m.id === missionId);
  const progress = useProgress((s) => s.missionStars);
  const completeMission = useProgress((s) => s.completeMission);
  const network = useEditor((s) => s.network);
  const history = useEditor((s) => s.history);
  const commands = useEditor((s) => s.commandsRun);
  const playback = useEditor((s) => s.playback);
  const startedAt = useEditor((s) => s.loadedAt);
  // Let the kid enjoy the printout before the mission card appears.
  const printing = useEditor((s) => s.printout !== null);
  const nudgedAt = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [result, setResult] = useState<{ stars: number; seconds: number } | null>(null);
  // "Stay here" closes the card but keeps the finished network on screen.
  const [stayed, setStayed] = useState(false);
  const playerLevel = useLevel();
  const unlocked = index >= 0 && isMissionUnlocked(index, progress, playerLevel);

  useEffect(() => {
    if (!mission || !unlocked) return;
    // Missions get the features they teach plus everything already unlocked.
    const features = [
      ...new Set([...(mission.features ?? []), ...unlockedFeatures(useProgress.getState().missionStars)]),
    ];
    useEditor
      .getState()
      .load(mission.setup(), { tools: mission.tools, sandbox: false, intro: mission.story, features });
  }, [mission, unlocked, attempt]);

  const restart = () => {
    setHintsUsed(0);
    setResult(null);
    setStayed(false);
    setAttempt((a) => a + 1);
  };

  const topo = useMemo(() => new Topology(network), [network]);

  // Check the goal whenever a packet animation finishes or the network changes.
  useEffect(() => {
    if (!mission || result || playback || printing || history.length === 0) return;
    const ctx = { network, topo, history, commands };
    if (!mission.check(ctx)) {
      // Not done yet: if the last try was close, give a friendly nudge after the result is read.
      // Nudge once per try, not again every time the network changes.
      if (nudgedAt.current === history.length) return;
      const tip = mission.nudge?.(history[history.length - 1], history, ctx);
      if (!tip) return;
      nudgedAt.current = history.length;
      const timer = window.setTimeout(() => useEditor.getState().say(tip, 'think', { append: true }), 2500);
      return () => window.clearTimeout(timer);
    }
    const seconds = Math.round((performance.now() - startedAt) / 1000);
    const stars = missionStars(mission, hintsUsed, useEditor.getState().failures, seconds);
    // Give the kid time to read what just happened: longer after terminal output.
    const lastCommand = commands.at(-1);
    const afterCommand = lastCommand !== undefined && lastCommand.at >= history.length - 1;
    const timer = window.setTimeout(
      () => {
        setResult({ stars, seconds });
        completeMission(mission.id, stars);
        playSound('jingleWin');
        burstConfetti();
      },
      afterCommand ? READ_COMMAND_MS : READ_RESULT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [
    mission,
    network,
    topo,
    history,
    commands,
    playback,
    result,
    hintsUsed,
    completeMission,
    startedAt,
    printing,
  ]);

  if (!mission || !unlocked) {
    return (
      <Page title={mission ? 'Mission locked' : 'Mission not found'}>
        <p>
          {mission && (mission.minLevel ?? 1) > playerLevel
            ? `This mission needs level ${mission.minLevel}. Play more missions and build networks to level up!`
            : 'Finish the missions before this one first!'}
        </p>
        <KidButton onClick={() => navigate('missions')}>Back to missions</KidButton>
      </Page>
    );
  }

  const next = MISSIONS[index + 1];

  return (
    <>
      <EditorView
        fitKey={`${mission.id}-${attempt}`}
        header={
          <GoalCard
            mission={mission}
            number={index + 1}
            hintsUsed={hintsUsed}
            running={!result}
            done={
              result && stayed
                ? { stars: result.stars, onNext: next ? () => navigate(`missions/${next.id}`) : undefined }
                : undefined
            }
            startedAt={startedAt}
            onHint={() => {
              const hint = mission.hints[Math.min(hintsUsed, mission.hints.length - 1)];
              setHintsUsed((h) => h + 1);
              playSound('pop');
              useEditor.getState().say(hint, 'think');
            }}
            onRestart={restart}
          />
        }
      />
      <MissionComplete
        open={result !== null && !stayed}
        onStay={() => setStayed(true)}
        mission={mission}
        stars={result?.stars ?? 0}
        seconds={result?.seconds ?? 0}
        onReplay={restart}
        onNext={next ? () => navigate(`missions/${next.id}`) : undefined}
      />
    </>
  );
}
