package com.capgo.mediasession;

import android.content.Intent;

public final class MediaSessionIntentUtils {

    private MediaSessionIntentUtils() {}

    public static boolean isMediaButtonIntent(Intent intent) {
        if (intent == null) {
            return false;
        }
        return isMediaButtonIntent(intent.getAction(), intent.hasExtra(Intent.EXTRA_KEY_EVENT));
    }

    static boolean isMediaButtonIntent(String action, boolean hasKeyEventExtra) {
        return Intent.ACTION_MEDIA_BUTTON.equals(action);
    }

    public static boolean shouldAbortOrphanMediaButtonStart(boolean sessionInitialized, Intent intent) {
        if (intent == null) {
            return false;
        }
        return shouldAbortOrphanMediaButtonStart(sessionInitialized, intent.getAction(), intent.hasExtra(Intent.EXTRA_KEY_EVENT));
    }

    static boolean shouldAbortOrphanMediaButtonStart(boolean sessionInitialized, String action, boolean hasKeyEventExtra) {
        return !sessionInitialized && isMediaButtonIntent(action, hasKeyEventExtra);
    }
}
