import { MediaSession } from '@capgo/capacitor-media-session';

window.testEcho = () => {
    const inputValue = document.getElementById("echoInput").value;
    MediaSession.echo({ value: inputValue })
}
