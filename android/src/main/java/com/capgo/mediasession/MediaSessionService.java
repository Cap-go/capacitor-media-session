package com.capgo.mediasession;

import android.annotation.SuppressLint;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import androidx.media.session.MediaButtonReceiver;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class MediaSessionService extends Service {
    private static final String TAG = "MediaSessionService";
    private static final String CHANNEL_ID = "playback";
    private static final int NOTIFICATION_ID = 1;

    private MediaSessionCompat mediaSession;
    private PlaybackStateCompat.Builder playbackStateBuilder;
    private MediaMetadataCompat.Builder mediaMetadataBuilder;
    private NotificationManager notificationManager;
    private NotificationCompat.Builder notificationBuilder;
    private MediaStyle notificationStyle;

    private final Map<String, NotificationCompat.Action> notificationActions = new HashMap<>();
    private final Map<String, Long> playbackStateActions = new HashMap<>();
    private final String[] possibleActions = {
        "previoustrack",
        "seekbackward",
        "play",
        "pause",
        "seekforward",
        "nexttrack",
        "seekto",
        "stop"
    };
    private final Set<String> possibleCompactViewActions =
        new HashSet<>(Arrays.asList("previoustrack", "play", "pause", "nexttrack", "stop"));

    private int playbackState = PlaybackStateCompat.STATE_NONE;
    private String title = "";
    private String artist = "";
    private String album = "";
    private Bitmap artwork;
    private long duration = 0;
    private long position = 0;
    private float playbackSpeed = 1.0F;

    private boolean possibleActionsUpdate = true;
    private boolean playbackStateUpdate = false;
    private boolean mediaMetadataUpdate = false;
    private boolean notificationUpdate = false;

    private MediaSessionPlugin plugin;

    private final IBinder binder = new LocalBinder();

    public final class LocalBinder extends Binder {
        MediaSessionService getService() {
            return MediaSessionService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public boolean onUnbind(Intent intent) {
        destroy();
        return super.onUnbind(intent);
    }

    public void connectAndInitialize(MediaSessionPlugin plugin, Intent intent) {
        this.plugin = plugin;

        mediaSession = new MediaSessionCompat(this, "CapgoMediaSession");
        mediaSession.setCallback(new MediaSessionCallback(plugin));
        mediaSession.setActive(true);

        playbackStateBuilder = new PlaybackStateCompat.Builder()
            .setActions(PlaybackStateCompat.ACTION_PLAY)
            .setState(PlaybackStateCompat.STATE_PAUSED, position, playbackSpeed);
        mediaSession.setPlaybackState(playbackStateBuilder.build());

        mediaMetadataBuilder = new MediaMetadataCompat.Builder()
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, duration);
        mediaSession.setMetadata(mediaMetadataBuilder.build());

        notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            Log.w(TAG, "Notification manager unavailable");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel =
                new NotificationChannel(CHANNEL_ID, "Playback", NotificationManager.IMPORTANCE_LOW);
            notificationManager.createNotificationChannel(channel);
        }

        notificationStyle = new MediaStyle().setMediaSession(mediaSession.getSessionToken());
        notificationBuilder =
            new NotificationCompat.Builder(this, CHANNEL_ID)
                .setStyle(notificationStyle)
                .setSmallIcon(R.drawable.ic_baseline_volume_up_24)
                .setContentIntent(
                    PendingIntent.getActivity(
                        getApplicationContext(),
                        0,
                        intent,
                        PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                    )
                )
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notificationBuilder.build(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            );
        } else {
            startForeground(NOTIFICATION_ID, notificationBuilder.build());
        }

        notificationActions.put(
            "play",
            new NotificationCompat.Action(
                R.drawable.ic_baseline_play_arrow_24,
                "Play",
                MediaButtonReceiver.buildMediaButtonPendingIntent(
                    this,
                    PlaybackStateCompat.ACTION_PLAY_PAUSE | PlaybackStateCompat.ACTION_PLAY
                )
            )
        );
        notificationActions.put(
            "pause",
            new NotificationCompat.Action(
                R.drawable.ic_baseline_pause_24,
                "Pause",
                MediaButtonReceiver.buildMediaButtonPendingIntent(
                    this,
                    PlaybackStateCompat.ACTION_PLAY_PAUSE | PlaybackStateCompat.ACTION_PAUSE
                )
            )
        );
        notificationActions.put(
            "seekbackward",
            new NotificationCompat.Action(
                R.drawable.ic_baseline_replay_30_24,
                "Seek backward",
                MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_REWIND)
            )
        );
        notificationActions.put(
            "seekforward",
            new NotificationCompat.Action(
                R.drawable.ic_baseline_forward_30_24,
                "Seek forward",
                MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_FAST_FORWARD)
            )
        );
        notificationActions.put(
            "previoustrack",
            new NotificationCompat.Action(
                R.drawable.ic_baseline_skip_previous_24,
                "Previous track",
                MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS)
            )
        );
        notificationActions.put(
            "nexttrack",
            new NotificationCompat.Action(
                R.drawable.ic_baseline_skip_next_24,
                "Next track",
                MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_SKIP_TO_NEXT)
            )
        );
        notificationActions.put(
            "stop",
            new NotificationCompat.Action(
                R.drawable.ic_baseline_stop_24,
                "Stop",
                MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_STOP)
            )
        );

        playbackStateActions.put("previoustrack", PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS);
        playbackStateActions.put("seekbackward", PlaybackStateCompat.ACTION_REWIND);
        playbackStateActions.put(
            "play",
            PlaybackStateCompat.ACTION_PLAY_PAUSE | PlaybackStateCompat.ACTION_PLAY
        );
        playbackStateActions.put(
            "pause",
            PlaybackStateCompat.ACTION_PLAY_PAUSE | PlaybackStateCompat.ACTION_PAUSE
        );
        playbackStateActions.put("seekforward", PlaybackStateCompat.ACTION_FAST_FORWARD);
        playbackStateActions.put("nexttrack", PlaybackStateCompat.ACTION_SKIP_TO_NEXT);
        playbackStateActions.put("seekto", PlaybackStateCompat.ACTION_SEEK_TO);
        playbackStateActions.put("stop", PlaybackStateCompat.ACTION_STOP);
    }

    public void destroy() {
        stopForeground(true);
        stopSelf();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (mediaSession != null) {
            MediaButtonReceiver.handleIntent(mediaSession, intent);
        }
        return super.onStartCommand(intent, flags, startId);
    }

    public void setPlaybackState(int newPlaybackState) {
        if (playbackState != newPlaybackState) {
            playbackState = newPlaybackState;
            playbackStateUpdate = true;
            possibleActionsUpdate = true;
        }
    }

    public void setTitle(String newTitle) {
        if (!title.equals(newTitle)) {
            title = newTitle != null ? newTitle : "";
            mediaMetadataUpdate = true;
            notificationUpdate = true;
        }
    }

    public void setArtist(String newArtist) {
        if (!artist.equals(newArtist)) {
            artist = newArtist != null ? newArtist : "";
            mediaMetadataUpdate = true;
            notificationUpdate = true;
        }
    }

    public void setAlbum(String newAlbum) {
        if (!album.equals(newAlbum)) {
            album = newAlbum != null ? newAlbum : "";
            mediaMetadataUpdate = true;
            notificationUpdate = true;
        }
    }

    public void setArtwork(Bitmap newArtwork) {
        artwork = newArtwork;
        mediaMetadataUpdate = true;
        notificationUpdate = true;
    }

    public void setDuration(long newDuration) {
        if (duration != newDuration) {
            duration = newDuration;
            mediaMetadataUpdate = true;
            notificationUpdate = true;
        }
    }

    public void setPosition(long newPosition) {
        if (position != newPosition) {
            position = newPosition;
            playbackStateUpdate = true;
        }
    }

    public void setPlaybackSpeed(float newPlaybackSpeed) {
        if (playbackSpeed != newPlaybackSpeed) {
            playbackSpeed = newPlaybackSpeed;
            playbackStateUpdate = true;
        }
    }

    @SuppressLint("RestrictedApi")
    public void update() {
        if (possibleActionsUpdate) {
            if (notificationBuilder != null) {
                notificationBuilder.mActions.clear();
            }

            long activePlaybackStateActions = 0;
            int[] activeCompactViewActionIndices = new int[3];
            int notificationActionIndex = 0;
            int compactNotificationActionIndicesIndex = 0;

            for (String actionName : possibleActions) {
                if (plugin != null && plugin.hasActionHandler(actionName)) {
                    if ("play".equals(actionName) && playbackState != PlaybackStateCompat.STATE_PAUSED) {
                        continue;
                    }
                    if ("pause".equals(actionName) && playbackState != PlaybackStateCompat.STATE_PLAYING) {
                        continue;
                    }

                    if (playbackStateActions.containsKey(actionName)) {
                        activePlaybackStateActions =
                            activePlaybackStateActions | playbackStateActions.get(actionName);
                    }

                    if (notificationActions.containsKey(actionName) && notificationBuilder != null) {
                        notificationBuilder.addAction(notificationActions.get(actionName));
                        if (
                            possibleCompactViewActions.contains(actionName) &&
                            compactNotificationActionIndicesIndex < 3
                        ) {
                            activeCompactViewActionIndices[compactNotificationActionIndicesIndex] =
                                notificationActionIndex;
                            compactNotificationActionIndicesIndex++;
                        }
                        notificationActionIndex++;
                    }
                }
            }

            if (playbackStateBuilder != null) {
                playbackStateBuilder.setActions(activePlaybackStateActions);
            }
            if (notificationStyle != null) {
                if (compactNotificationActionIndicesIndex > 0) {
                    notificationStyle.setShowActionsInCompactView(
                        Arrays.copyOfRange(
                            activeCompactViewActionIndices,
                            0,
                            compactNotificationActionIndicesIndex
                        )
                    );
                } else {
                    notificationStyle.setShowActionsInCompactView();
                }
            }

            possibleActionsUpdate = false;
            playbackStateUpdate = true;
            notificationUpdate = true;
        }

        if (playbackStateUpdate && playbackStateBuilder != null) {
            playbackStateBuilder.setState(playbackState, position, playbackSpeed);
            mediaSession.setPlaybackState(playbackStateBuilder.build());
            playbackStateUpdate = false;
        }

        if (mediaMetadataUpdate && mediaMetadataBuilder != null) {
            mediaMetadataBuilder
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album)
                .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artwork)
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, duration);
            mediaSession.setMetadata(mediaMetadataBuilder.build());
            mediaMetadataUpdate = false;
        }

        if (notificationUpdate && notificationBuilder != null && notificationManager != null) {
            notificationBuilder
                .setContentTitle(title)
                .setContentText(artist + " - " + album)
                .setLargeIcon(artwork);
            notificationManager.notify(NOTIFICATION_ID, notificationBuilder.build());
            notificationUpdate = false;
        }
    }

    public void updatePossibleActions() {
        possibleActionsUpdate = true;
        update();
    }
}
