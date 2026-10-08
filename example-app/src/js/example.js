import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { MediaSession } from '@capgo/capacitor-media-session';
import '../style.css';

const logOutput = document.getElementById('logOutput');
const artworkPreview = document.getElementById('artworkPreview');
const playbackStateBadge = document.getElementById('playbackStateBadge');
const playbackStateSelect = document.getElementById('playbackStateSelect');
const metadataArtworkInput = document.getElementById('metadataArtwork');
const logs = [];
const maxLogEntries = 50;

const log = (message, level = 'info') => {
  const timestamp = new Date().toISOString().split('T')[1]?.replace('Z', '') ?? '';
  const entry = `[${timestamp}] ${message}`;
  logs.push(entry);
  if (logs.length > maxLogEntries) {
    logs.shift();
  }
  if (logOutput) {
    logOutput.textContent = logs.join('\n');
  }
  if (level === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
};

const handleError = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  log(`Error: ${message}`, 'error');
};

const syncArtworkPreview = () => {
  const artwork = metadataArtworkInput?.value?.trim();
  if (artworkPreview && artwork) {
    artworkPreview.src = artwork;
  }
};

const syncPlaybackBadge = (playbackState) => {
  if (!playbackStateBadge) {
    return;
  }
  playbackStateBadge.textContent = playbackState;
  playbackStateBadge.dataset.state = playbackState;
};

const applyMetadata = async () => {
  const title = document.getElementById('metadataTitle')?.value?.trim();
  const artist = document.getElementById('metadataArtist')?.value?.trim();
  const album = document.getElementById('metadataAlbum')?.value?.trim();
  const artwork = document.getElementById('metadataArtwork')?.value?.trim();

  const artworkEntries = artwork ? [{ src: artwork }] : [];

  await MediaSession.setMetadata({
    title,
    artist,
    album,
    artwork: artworkEntries,
  });
  syncArtworkPreview();
  log('Metadata updated.');
};

const applyPlaybackState = async () => {
  const playbackState = playbackStateSelect?.value ?? 'none';
  await MediaSession.setPlaybackState({ playbackState });
  syncPlaybackBadge(playbackState);
  log(`Playback state set to "${playbackState}".`);
};

const actionHandlers = new Map();

const registerActionHandler = async (action, checked) => {
  if (checked) {
    const handler = (details) => {
      const seekPart = details.seekTime == null ? '' : ` (seekTime: ${details.seekTime})`;
      log(`Action received: ${details.action}${seekPart}`);
    };
    actionHandlers.set(action, handler);
    await MediaSession.setActionHandler({ action }, handler);
    log(`Handler registered for "${action}".`);
  } else {
    actionHandlers.delete(action);
    await MediaSession.setActionHandler({ action }, null);
    log(`Handler cleared for "${action}".`);
  }
};

const resetHandlers = async () => {
  const toggles = document.querySelectorAll('.action-toggle');
  await Promise.all(
    Array.from(toggles).map(async (toggle) => {
      if (toggle instanceof HTMLInputElement) {
        toggle.checked = false;
        await registerActionHandler(toggle.value, false);
      }
    }),
  );
  log('All action handlers cleared.');
};

const parseNumber = (value) => {
  if (value === '' || value == null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const applyPositionState = async () => {
  const durationInput = document.getElementById('positionDuration');
  const playbackRateInput = document.getElementById('positionPlaybackRate');
  const currentInput = document.getElementById('positionCurrent');

  const payload = {
    duration: parseNumber(durationInput?.value ?? ''),
    playbackRate: parseNumber(playbackRateInput?.value ?? ''),
    position: parseNumber(currentInput?.value ?? ''),
  };

  await MediaSession.setPositionState(payload);
  log('Position state updated.');
};

const setupEventListeners = () => {
  document.getElementById('applyMetadataBtn')?.addEventListener('click', () =>
    applyMetadata().catch(handleError),
  );
  document.getElementById('applyPlaybackStateBtn')?.addEventListener('click', () =>
    applyPlaybackState().catch(handleError),
  );
  document.getElementById('applyPositionStateBtn')?.addEventListener('click', () =>
    applyPositionState().catch(handleError),
  );
  document.getElementById('resetHandlersBtn')?.addEventListener('click', () =>
    resetHandlers().catch(handleError),
  );
  document.getElementById('clearLogBtn')?.addEventListener('click', () => {
    logs.length = 0;
    if (logOutput) {
      logOutput.textContent = '';
    }
    log('Log cleared.');
  });

  metadataArtworkInput?.addEventListener('input', syncArtworkPreview);
  playbackStateSelect?.addEventListener('change', () => {
    syncPlaybackBadge(playbackStateSelect.value ?? 'none');
  });

  const toggles = document.querySelectorAll('.action-toggle');
  toggles.forEach((toggle) => {
    toggle.addEventListener('change', (event) => {
      const input = event.currentTarget;
      if (!(input instanceof HTMLInputElement)) {
        return;
      }
      registerActionHandler(input.value, input.checked).catch(handleError);
    });
  });
};

const bootstrap = async () => {
  setupEventListeners();
  syncArtworkPreview();
  syncPlaybackBadge(playbackStateSelect?.value ?? 'playing');

  // Register handlers for toggles that start checked.
  const toggles = document.querySelectorAll('.action-toggle:checked');
  await Promise.all(
    Array.from(toggles).map((toggle) =>
      toggle instanceof HTMLInputElement
        ? registerActionHandler(toggle.value, true)
        : Promise.resolve(),
    ),
  );

  try {
    await applyMetadata();
    await applyPlaybackState();
    await applyPositionState();
  } catch (error) {
    handleError(error);
    throw error;
  }
};

bootstrap()
  .then(() => {
    if (Capacitor.isNativePlatform()) {
      return CapacitorUpdater.notifyAppReady().catch((error) => {
        console.error('Capgo notifyAppReady failed', error);
      });
    }
    return undefined;
  })
  .catch(handleError);
