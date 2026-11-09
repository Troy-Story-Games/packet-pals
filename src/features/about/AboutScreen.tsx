import { useEffect, useState } from 'react';
import { APP_NAME, APP_TAGLINE, APP_VERSION, REPO_URL, STUDIO } from '@/app/config';
import { navigate } from '@/app/router';
import { Emoji } from '@/components/Emoji';
import { InstallButton } from '@/components/InstallButton';
import { KidButton } from '@/components/KidButton';
import { Page } from '@/components/Page';
import { speechStatus } from '@/services/speech/speak';
import styles from './AboutScreen.module.css';

/** Opens a website in the browser (Electron sends it to the system browser). */
const openLink = (url: string) => window.open(url, '_blank', 'noopener');

/** Who made the game, where its code lives, and a read-aloud check for grown-ups. */
export function AboutScreen() {
  const [speech, setSpeech] = useState(speechStatus);

  // Voices can load a moment after the page opens.
  useEffect(() => {
    const timer = window.setTimeout(() => setSpeech(speechStatus()), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Page title={`About ${APP_NAME}`} emoji="2139">
      <section className={styles.card}>
        <img className={styles.icon} src="./pwa-192.png" alt="" width={96} height={96} />
        <p className={styles.tagline}>{APP_TAGLINE}</p>
        <p className={styles.version}>Version {APP_VERSION}</p>
        <InstallButton />
      </section>

      <section className={styles.card}>
        <p className={styles.made}>
          <Emoji code="1f3ae" size={32} /> Made with <Emoji code="2764" size={24} /> by
        </p>
        <KidButton size="lg" onClick={() => openLink(STUDIO.url)}>
          {STUDIO.name}
        </KidButton>
        <p className={styles.small}>troystorygames.com</p>
      </section>

      <section className={styles.card}>
        <p className={styles.made}>
          <Emoji code="1f4bb" size={32} /> {APP_NAME} is open source!
        </p>
        <p className={styles.small}>
          Anyone can read the code and see how it works. It's free under the MIT license.
        </p>
        <div className={styles.row}>
          <KidButton variant="secondary" onClick={() => openLink(REPO_URL)}>
            See the code on GitHub
          </KidButton>
          <KidButton variant="ghost" onClick={() => navigate('credits')}>
            Credits & thanks
          </KidButton>
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.made}>
          <Emoji code="1f50a" size={28} /> Read-aloud
        </p>
        <p className={styles.small}>
          {!speech.supported
            ? 'This browser cannot read aloud.'
            : speech.voices > 0
              ? `Ready! This device has ${speech.voices} voices.`
              : 'No voices found yet. On Android, install or update "Speech Services by Google" and set it as the text-to-speech engine in Settings.'}
        </p>
      </section>
    </Page>
  );
}
