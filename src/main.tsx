import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import './styles/tokens.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { unlockAudioOnGesture } from './services/audio/context';
import { preloadSounds } from './services/audio/sfx';
import { listenForInstall } from './services/install/installPrompt';

// Browsers block audio until the first tap, so decode sounds then.
unlockAudioOnGesture(preloadSounds);
// The install offer arrives once, early, so listen before the app renders.
listenForInstall();

// Service workers only work over http(s); Electron loads the app from file://.
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
