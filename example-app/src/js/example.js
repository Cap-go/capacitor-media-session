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
let mediaKeyActionCount = 0;

const e2eStoragePrefix = 'capgo-media-session-e2e:';
const harnessInstanceId = globalThis.crypto?.randomUUID?.() ?? `harness-${Date.now()}`;

const e2eOutcomeLabel = document.getElementById('e2e-outcome-label');
const e2eHarnessReady = document.getElementById('e2e-harness-ready');
const e2eOrphanRunMarker = document.getElementById('e2e-orphan-run-marker');

const writeE2eState = (key, value) => {
  try {
    sessionStorage.setItem(`${e2eStoragePrefix}${key}`, value);
  } catch {
    // Ignore storage errors in the harness.
  }
};

const readE2eState = (key) => {
  try {
    return sessionStorage.getItem(`${e2eStoragePrefix}${key}`);
  } catch {
    return null;
  }
};

const updateOrphanRunMarker = (runId) => {
  if (e2eOrphanRunMarker) {
    e2eOrphanRunMarker.textContent = runId ? `Orphan run: ${runId}` : 'Orphan run: none';
    e2eOrphanRunMarker.dataset.runId = runId ?? '';
  }
};

const setE2eOutcome = (label) => {
  if (e2eOutcomeLabel) {
    e2eOutcomeLabel.textContent = `Outcome: ${label}`;
    e2eOutcomeLabel.dataset.outcome = label;
  }
};

const markHarnessReady = () => {
  if (e2eHarnessReady) {
    e2eHarnessReady.textContent = 'Harness: ready';
  }
};

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

const runE2ePrepareOrphanMediaKey = async () => {
  setE2eOutcome('running');
  mediaKeyActionCount = 0;
  const runId = globalThis.crypto?.randomUUID?.() ?? `orphan-${Date.now()}`;
  writeE2eState('orphan-run-id', runId);
  writeE2eState('harness-instance-id', harnessInstanceId);
  writeE2eState('orphan-phase', 'preparing');
  writeE2eState('orphan-action-count', '0');
  updateOrphanRunMarker(runId);
  try {
    await MediaSession.setMetadata({
      title: 'E2E Track',
      artist: 'Capgo',
      album: 'Orphan test',
      artwork: [],
    });
    await MediaSession.setActionHandler({ action: 'play' }, () => {
      mediaKeyActionCount += 1;
      writeE2eState('orphan-action-count', String(mediaKeyActionCount));
      log('Action received: play');
    });
    await MediaSession.setPlaybackState({ playbackState: 'playing' });
    await MediaSession.setPlaybackState({ playbackState: 'none' });
    await new Promise((resolve) => {
      globalThis.setTimeout(resolve, 750);
    });
    writeE2eState('orphan-phase', 'prepared');
    setE2eOutcome('M:orphan-media-key:prepared');
  } catch (error) {
    handleError(error);
    const message = error instanceof Error ? error.message : String(error);
    setE2eOutcome(`M:orphan-media-key:error:${message}`);
  }
};

const runE2eVerifyOrphanMediaKey = async () => {
  const storedRunId = readE2eState('orphan-run-id');
  const storedPhase = readE2eState('orphan-phase');
  const storedInstanceId = readE2eState('harness-instance-id');
  if (!storedRunId || storedPhase !== 'prepared' || storedInstanceId !== harnessInstanceId) {
    setE2eOutcome('M:orphan-media-key:process-reset');
    return;
  }

  const storedCount = Number(readE2eState('orphan-action-count') ?? '0');
  if (storedCount > 0 || mediaKeyActionCount > 0) {
    setE2eOutcome('M:orphan-media-key:unexpected-action');
    return;
  }

  try {
    await MediaSession.getPluginVersion();
  } catch (error) {
    handleError(error);
    const message = error instanceof Error ? error.message : String(error);
    setE2eOutcome(`M:orphan-media-key:error:${message}`);
    return;
  }

  updateOrphanRunMarker(storedRunId);
  setE2eOutcome('M:orphan-media-key:success');
};

const runE2ePrepareActiveMediaKey = async () => {
  setE2eOutcome('running');
  mediaKeyActionCount = 0;
  writeE2eState('active-phase', 'preparing');
  writeE2eState('harness-instance-id', harnessInstanceId);
  writeE2eState('active-action-count', '0');
  try {
    await MediaSession.setMetadata({
      title: 'E2E Track',
      artist: 'Capgo',
      album: 'Active test',
      artwork: [],
    });
    await MediaSession.setActionHandler({ action: 'pause' }, () => {
      mediaKeyActionCount += 1;
      writeE2eState('active-action-count', String(mediaKeyActionCount));
      log('Action received: pause');
    });
    await MediaSession.setPlaybackState({ playbackState: 'playing' });
    await new Promise((resolve) => {
      globalThis.setTimeout(resolve, 750);
    });
    writeE2eState('active-phase', 'prepared');
    setE2eOutcome('M:media-key-active:prepared');
  } catch (error) {
    handleError(error);
    const message = error instanceof Error ? error.message : String(error);
    setE2eOutcome(`M:media-key-active:error:${message}`);
  }
};

const runE2eVerifyActiveMediaKey = async () => {
  const storedPhase = readE2eState('active-phase');
  const storedInstanceId = readE2eState('harness-instance-id');
  if (storedPhase !== 'prepared' || storedInstanceId !== harnessInstanceId) {
    setE2eOutcome('M:media-key-active:process-reset');
    return;
  }

  try {
    await MediaSession.getPluginVersion();
  } catch (error) {
    handleError(error);
    const message = error instanceof Error ? error.message : String(error);
    setE2eOutcome(`M:media-key-active:error:${message}`);
    return;
  }

  const storedCount = Number(readE2eState('active-action-count') ?? '0');
  if (storedCount > 0 || mediaKeyActionCount > 0) {
    setE2eOutcome('M:media-key-active:success');
    return;
  }
  setE2eOutcome('M:media-key-active:no-action');
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

  document.getElementById('e2ePrepareOrphanMediaKeyBtn')?.addEventListener('click', () =>
    runE2ePrepareOrphanMediaKey().catch(handleError),
  );
  document.getElementById('e2eVerifyOrphanMediaKeyBtn')?.addEventListener('click', () => {
    runE2eVerifyOrphanMediaKey().catch(handleError);
  });
  document.getElementById('e2ePrepareActiveMediaKeyBtn')?.addEventListener('click', () =>
    runE2ePrepareActiveMediaKey().catch(handleError),
  );
  document.getElementById('e2eVerifyActiveMediaKeyBtn')?.addEventListener('click', () => {
    runE2eVerifyActiveMediaKey().catch(handleError);
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
    markHarnessReady();
    if (Capacitor.isNativePlatform()) {
      return CapacitorUpdater.notifyAppReady().catch((error) => {
        console.error('Capgo notifyAppReady failed', error);
      });
    }
    return undefined;
  })
  .catch(handleError);
