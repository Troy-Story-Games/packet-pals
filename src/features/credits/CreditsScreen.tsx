import { Mascot } from '@/components/pip/Mascot';
import { Page } from '@/components/Page';
import { Panel } from '@/components/Panel';
import { CREDITS } from './credits';
import styles from './CreditsScreen.module.css';

export function CreditsScreen() {
  return (
    <Page title="Credits & Thanks" emoji="1f381">
      <Mascot
        mood="happy"
        says="Lots of kind people made the pictures, sounds and letters in this app and shared them for free. Thank you!"
        size={96}
      />
      <Panel className={styles.panel}>
        <ul className={styles.list}>
          {CREDITS.map((c) => (
            <li key={c.what}>
              <strong>{c.what}</strong>
              <span>
                by {c.author} · {c.license}
              </span>
              <a href={c.url} target="_blank" rel="noreferrer">
                {c.url.replace(/^https:\/\//, '')}
              </a>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          The background music is made up by the computer as it plays, so no two songs are the same. The QR
          code maker was written from scratch for this app. QR Code is a registered trademark of DENSO WAVE
          INCORPORATED.
        </p>
      </Panel>
    </Page>
  );
}
