import { lazy, Suspense, useEffect } from 'react';
import { HomeScreen } from '@/features/home/HomeScreen';
import { useProgress } from '@/game/progressStore';
import { startMusic, stopMusic } from '@/services/audio/music';
import { useSettings } from '@/services/settings';
import { stopSpeaking } from '@/services/speech/speak';
import { useRoute, type Route } from './router';
import { CelebrationLayer } from './shell/CelebrationLayer';
import { TopBar } from './shell/TopBar';

// Screens load on demand so the home screen appears fast on tablets.
const MissionsScreen = lazy(() =>
  import('@/features/missions/MissionsScreen').then((m) => ({ default: m.MissionsScreen })),
);
const MissionScreen = lazy(() =>
  import('@/features/missions/MissionScreen').then((m) => ({ default: m.MissionScreen })),
);
const SandboxScreen = lazy(() =>
  import('@/features/sandbox/SandboxScreen').then((m) => ({ default: m.SandboxScreen })),
);
const BookScreen = lazy(() => import('@/features/book/BookScreen').then((m) => ({ default: m.BookScreen })));
const TrophiesScreen = lazy(() =>
  import('@/features/trophies/TrophiesScreen').then((m) => ({ default: m.TrophiesScreen })),
);
const AboutScreen = lazy(() =>
  import('@/features/about/AboutScreen').then((m) => ({ default: m.AboutScreen })),
);
const CreditsScreen = lazy(() =>
  import('@/features/credits/CreditsScreen').then((m) => ({ default: m.CreditsScreen })),
);

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'missions':
      return <MissionsScreen />;
    case 'mission':
      return <MissionScreen key={route.id} missionId={route.id} />;
    case 'sandbox':
      return <SandboxScreen shared={route.shared} />;
    case 'book':
      return <BookScreen />;
    case 'trophies':
      return <TrophiesScreen />;
    case 'credits':
      return <CreditsScreen />;
    case 'about':
      return <AboutScreen />;
    default:
      return <HomeScreen />;
  }
}

export function App() {
  const route = useRoute();
  const music = useSettings((s) => s.music);
  const checkIn = useProgress((s) => s.checkIn);

  useEffect(() => checkIn(), [checkIn]);

  useEffect(() => {
    if (music) startMusic();
    else stopMusic();
    return stopMusic;
  }, [music]);

  useEffect(() => {
    stopSpeaking();
    window.scrollTo({ top: 0 });
  }, [route.name]);

  return (
    <>
      <TopBar />
      <Suspense fallback={null}>
        <Screen route={route} />
      </Suspense>
      <CelebrationLayer />
    </>
  );
}
