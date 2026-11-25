var command = java.lang.Runtime.getRuntime().exec(['adb', 'shell', 'input', 'keyevent', '85']);
var exitCode = command.waitFor();
if (exitCode !== 0) {
  throw new Error('adb media key injection failed with exit code ' + exitCode);
}
output.mediaKeySent = 'true';
