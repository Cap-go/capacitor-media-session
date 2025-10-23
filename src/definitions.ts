export interface MediaImage {
  src: string;
  sizes?: string;
  type?: string;
}

export type MediaSessionPlaybackState = 'none' | 'paused' | 'playing';

export type MediaSessionAction =
  | 'play'
  | 'pause'
  | 'seekbackward'
  | 'seekforward'
  | 'previoustrack'
  | 'nexttrack'
  | 'seekto'
  | 'stop';

export interface MetadataOptions {
  album?: string;
  artist?: string;
  artwork?: MediaImage[];
  title?: string;
}

export interface PlaybackStateOptions {
  playbackState: MediaSessionPlaybackState;
}

export interface ActionHandlerOptions {
  action: MediaSessionAction;
}

export type ActionHandler = (details: ActionDetails) => void;

interface ActionDetails {
  action: MediaSessionAction;
  seekTime?: number | null;
}

export interface PositionStateOptions {
  duration?: number;
  playbackRate?: number;
  position?: number;
}

export interface MediaSessionPlugin {
  /**
   * Sets metadata of the currently playing media.
   */
  setMetadata(options: MetadataOptions): Promise<void>;
  /**
   * Updates the playback state of the media session.
   */
  setPlaybackState(options: PlaybackStateOptions): Promise<void>;
  /**
   * Registers a handler for a media session action.
   */
  setActionHandler(options: ActionHandlerOptions, handler: ActionHandler | null): Promise<void>;
  /**
   * Updates position state for the active media session.
   */
  setPositionState(options: PositionStateOptions): Promise<void>;

  /**
   * Get the native Capacitor plugin version
   *
   * @returns {Promise<{ id: string }>} an Promise with version for this device
   * @throws An error if the something went wrong
   */
  getPluginVersion(): Promise<{ version: string }>;
}
