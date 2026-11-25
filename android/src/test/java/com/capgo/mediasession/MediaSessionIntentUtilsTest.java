package com.capgo.mediasession;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class MediaSessionIntentUtilsTest {

    private static final String ACTION_MEDIA_BUTTON = "android.intent.action.MEDIA_BUTTON";

    @Test
    public void detectsMediaButtonAction() {
        assertTrue(MediaSessionIntentUtils.isMediaButtonIntent(ACTION_MEDIA_BUTTON, false));
    }

    @Test
    public void ignoresKeyEventExtraWithoutMediaButtonAction() {
        assertFalse(MediaSessionIntentUtils.isMediaButtonIntent(null, true));
    }

    @Test
    public void ignoresPlainServiceStart() {
        assertFalse(MediaSessionIntentUtils.isMediaButtonIntent(null, false));
    }

    @Test
    public void orphanMediaButtonStartWithoutSessionShouldAbort() {
        assertTrue(MediaSessionIntentUtils.shouldAbortOrphanMediaButtonStart(false, ACTION_MEDIA_BUTTON, false));
    }

    @Test
    public void serviceStartForPlaybackBindShouldNotAbort() {
        assertFalse(MediaSessionIntentUtils.shouldAbortOrphanMediaButtonStart(false, null, false));
    }

    @Test
    public void mediaButtonWithActiveSessionShouldNotAbort() {
        assertFalse(MediaSessionIntentUtils.shouldAbortOrphanMediaButtonStart(true, ACTION_MEDIA_BUTTON, false));
    }
}
