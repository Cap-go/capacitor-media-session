package com.capgo.mediasession;

import com.getcapacitor.Logger;

public class MediaSession {

    public String echo(String value) {
        Logger.info("Echo", value);
        return value;
    }
}
