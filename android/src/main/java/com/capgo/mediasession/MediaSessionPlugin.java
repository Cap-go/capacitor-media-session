package com.capgo.mediasession;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.IBinder;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Base64;
import android.util.Log;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "MediaSession")
public class MediaSessionPlugin extends Plugin {

    private final String pluginVersion = "7.2.9";

    private static final String TAG = "CapgoMediaSession";

    private boolean startServiceOnlyDuringPlayback = true;

    private String title = "";
    private String artist = "";
    private String album = "";
    private Bitmap artwork;
    private String playbackState = "none";
    private double duration = 0.0;
    private double position = 0.0;
    private double playbackRate = 1.0;

    private final Map<String, PluginCall> actionHandlers = new HashMap<>();

    private MediaSessionService service;

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName componentName, IBinder binder) {
            MediaSessionService.LocalBinder localBinder = (MediaSessionService.LocalBinder) binder;
            service = localBinder.getService();
            if (getActivity() == null) {
                return;
            }
            Intent launchIntent = new Intent(getActivity(), getActivity().getClass());
            service.connectAndInitialize(MediaSessionPlugin.this, launchIntent);
            updateServiceMetadata();
            updateServicePlaybackState();
            updateServicePositionState();
        }

        @Override
        public void onServiceDisconnected(ComponentName componentName) {
            Log.d(TAG, "Disconnected from MediaSessionService");
            service = null;
        }
    };

    @Override
    public void load() {
        super.load();

        String foregroundServiceConfig = getConfig().getString("foregroundService", "");
        if ("always".equals(foregroundServiceConfig)) {
            startServiceOnlyDuringPlayback = false;
        }

        if (!startServiceOnlyDuringPlayback) {
            startMediaService();
        }
    }

    @Override
    protected void handleOnStop() {
        super.handleOnStop();

        if (startServiceOnlyDuringPlayback && service != null && !isPlaybackActive()) {
            stopMediaService();
        }
    }

    private void startMediaService() {
        Context context = getContext();
        if (context == null || getActivity() == null) {
            return;
        }

        Intent intent = new Intent(context, MediaSessionService.class);
        ContextCompat.startForegroundService(context, intent);
        context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
    }

    private void stopMediaService() {
        Context context = getContext();
        if (context == null || service == null) {
            return;
        }

        try {
            context.unbindService(serviceConnection);
        } catch (IllegalArgumentException ex) {
            Log.w(TAG, "Service already unbound", ex);
        }
        service = null;
    }

    private boolean isPlaybackActive() {
        return "playing".equals(playbackState) || "paused".equals(playbackState);
    }

    private void updateServiceMetadata() {
        if (service == null) {
            return;
        }
        service.setTitle(title);
        service.setArtist(artist);
        service.setAlbum(album);
        service.setArtwork(artwork);
        service.update();
    }

    private void updateServicePlaybackState() {
        if (service == null) {
            return;
        }

        if ("playing".equals(playbackState)) {
            service.setPlaybackState(PlaybackStateCompat.STATE_PLAYING);
        } else if ("paused".equals(playbackState)) {
            service.setPlaybackState(PlaybackStateCompat.STATE_PAUSED);
        } else {
            service.setPlaybackState(PlaybackStateCompat.STATE_NONE);
        }
        service.update();
    }

    private void updateServicePositionState() {
        if (service == null) {
            return;
        }

        service.setDuration(Math.round(duration * 1000));
        service.setPosition(Math.round(position * 1000));
        float playbackSpeed = playbackRate == 0.0 ? 1.0F : (float) playbackRate;
        service.setPlaybackSpeed(playbackSpeed);
        service.update();
    }

    private Bitmap urlToBitmap(String url) throws IOException {
        if (url == null || url.isEmpty()) {
            return null;
        }

        boolean blobUrl = url.startsWith("blob:");
        if (blobUrl) {
            Log.i(TAG, "Blob URLs are not supported for media artwork");
            return null;
        }

        boolean httpUrl = url.startsWith("http");
        if (httpUrl) {
            HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setDoInput(true);
            connection.connect();
            try (InputStream inputStream = connection.getInputStream()) {
                return BitmapFactory.decodeStream(inputStream);
            }
        }

        int base64Index = url.indexOf(";base64,");
        if (base64Index != -1) {
            String base64Data = url.substring(base64Index + 8);
            byte[] decoded = Base64.decode(base64Data, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(decoded, 0, decoded.length);
        }

        return null;
    }

    @PluginMethod
    public void setMetadata(PluginCall call) {
        title = call.getString("title", title);
        artist = call.getString("artist", artist);
        album = call.getString("album", album);

        try {
            JSArray artworkArray = call.getArray("artwork");
            if (artworkArray != null) {
                List<JSONObject> artworkList = artworkArray.toList();
                for (JSONObject artworkJson : artworkList) {
                    String src = artworkJson.optString("src", null);
                    if (src != null) {
                        artwork = urlToBitmap(src);
                        break;
                    }
                }
            }
        } catch (JSONException | IOException ex) {
            Log.w(TAG, "Unable to parse artwork", ex);
        }

        updateServiceMetadata();
        call.resolve();
    }

    @PluginMethod
    public void setPlaybackState(PluginCall call) {
        playbackState = call.getString("playbackState", playbackState);

        boolean playbackActive = isPlaybackActive();
        if (startServiceOnlyDuringPlayback && service == null && playbackActive) {
            startMediaService();
        } else if (startServiceOnlyDuringPlayback && service != null && !playbackActive) {
            stopMediaService();
        } else {
            updateServicePlaybackState();
        }

        call.resolve();
    }

    @PluginMethod
    public void setPositionState(PluginCall call) {
        duration = call.getDouble("duration", duration);
        position = call.getDouble("position", position);
        playbackRate = call.getFloat("playbackRate", (float) playbackRate);

        updateServicePositionState();
        call.resolve();
    }

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void setActionHandler(PluginCall call) {
        call.setKeepAlive(true);
        String action = call.getString("action");
        if (action != null) {
            actionHandlers.put(action, call);
            if (service != null) {
                service.updatePossibleActions();
            }
        } else {
            call.resolve();
        }
    }

    public boolean hasActionHandler(String action) {
        PluginCall handler = actionHandlers.get(action);
        return handler != null && !PluginCall.CALLBACK_ID_DANGLING.equals(handler.getCallbackId());
    }

    public void actionCallback(String action) {
        actionCallback(action, new JSObject());
    }

    public void actionCallback(String action, JSObject data) {
        PluginCall handler = actionHandlers.get(action);
        if (handler != null && !PluginCall.CALLBACK_ID_DANGLING.equals(handler.getCallbackId())) {
            data.put("action", action);
            handler.resolve(data);
        } else {
            Log.d(TAG, "No handler for action " + action);
        }
    }

    @PluginMethod
    public void getPluginVersion(final PluginCall call) {
        try {
            final JSObject ret = new JSObject();
            ret.put("version", this.pluginVersion);
            call.resolve(ret);
        } catch (final Exception e) {
            call.reject("Could not get plugin version", e);
        }
    }
}
