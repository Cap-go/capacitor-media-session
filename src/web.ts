import { WebPlugin } from '@capacitor/core';

import type {
  ActionHandler,
  ActionHandlerOptions,
  MediaSessionPlugin,
  MetadataOptions,
  PlaybackStateOptions,
  PositionStateOptions,
} from './definitions';

export class MediaSessionWeb extends WebPlugin implements MediaSessionPlugin {
  async setMetadata(options: MetadataOptions): Promise<void> {
    const mediaSession = (navigator as any).mediaSession;
    if (!mediaSession) {
      throw this.unavailable('Media Session API not available in this browser.');
    }

    const MediaMetadataCtor = (window as any).MediaMetadata;
    if (MediaMetadataCtor) {
      mediaSession.metadata = new MediaMetadataCtor(options);
    } else {
      mediaSession.metadata = options;
    }
  }

  async setPlaybackState(options: PlaybackStateOptions): Promise<void> {
    const mediaSession = (navigator as any).mediaSession;
    if (!mediaSession) {
      throw this.unavailable('Media Session API not available in this browser.');
    }
    mediaSession.playbackState = options.playbackState;
  }

  async setActionHandler(
    options: ActionHandlerOptions,
    handler: ActionHandler | null,
  ): Promise<void> {
    const mediaSession = (navigator as any).mediaSession;
    if (!mediaSession) {
      throw this.unavailable('Media Session API not available in this browser.');
    }
    mediaSession.setActionHandler(options.action, handler);
  }

  async setPositionState(options: PositionStateOptions): Promise<void> {
    const mediaSession = (navigator as any).mediaSession;
    if (!mediaSession) {
      throw this.unavailable('Media Session API not available in this browser.');
    }
    mediaSession.setPositionState(options);
  }
}
