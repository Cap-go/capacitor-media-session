import { MediaSession } from '@capgo/capacitor-media-session';

const logOutput = document.getElementById('logOutput');
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
  log('Metadata updated.');
};

const applyPlaybackState = async () => {
  const select = document.getElementById('playbackStateSelect');
  const playbackState = select?.value ?? 'none';
  await MediaSession.setPlaybackState({ playbackState });
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
  }
};

bootstrap().catch(handleError);
