#!/bin/bash
# Run the smoke flow on the installed app and list every runtime exception
# the app logged while it ran.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
adb shell svc power stayon usb; adb shell input keyevent KEYCODE_WAKEUP; adb shell wm dismiss-keyguard
adb logcat -c
maestro test "$DIR/smoke.yaml" > "$DIR/../loop/state/smoke.log" 2>&1
code=$?
tr '\r' '\n' < "$DIR/../loop/state/smoke.log" | grep -E "COMPLETED|FAILED" | tail -4
echo "--- app exceptions:"
adb logcat -d | grep -E "FATAL EXCEPTION| E AndroidRuntime|NoSuchMethod|NoSuchField|ClassNotFound|NoClassDefFound|JavascriptException|Unable to instantiate|IncompatibleClassChange|AbstractMethodError" \
  | grep -v ComponentDiscovery | cut -c1-200 | sort -u | head -20
exit $code
