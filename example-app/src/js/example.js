import { MediaSession } from '@capgo/media-session';

window.testEcho = () => {
    const inputValue = document.getElementById("echoInput").value;
    MediaSession.echo({ value: inputValue })
}
