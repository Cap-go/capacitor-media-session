var command = java.lang.Runtime.getRuntime().exec(['adb', 'shell', 'input', 'keyevent', '85']);
command.waitFor();
output.mediaKeySent = 'true';
