#!/usr/bin/env bash
# Mirrors the launcher with scrcpy and injects gamepad-equivalent Android key
# events. Screenshots land in /tmp/opencode/gamepad-test for visual review.
set -euo pipefail

APK="${1:-}"
OUT="${GAMEPAD_TEST_DIR:-/tmp/opencode/gamepad-test}"
DEVICE="${ANDROID_SERIAL:-}"
GAMEPAD_MODE="${GAMEPAD_MODE:-uhid}"
SCRCPY_PID=""

adb_device() {
  if [[ -n "$DEVICE" ]]; then
    adb -s "$DEVICE" "$@"
  else
    adb "$@"
  fi
}

cleanup() {
  if [[ -n "$SCRCPY_PID" ]]; then
    kill "$SCRCPY_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

mkdir -p "$OUT"

if [[ -n "$APK" ]]; then
  echo "Installing $APK"
  adb_device install -r "$APK"
fi

DEVICE_ID="$(adb_device get-serialno)"
if [[ "$DEVICE_ID" == "unknown" ]]; then
  echo "No Android device found." >&2
  exit 1
fi

echo "Using device: $DEVICE_ID"
adb_device shell am force-stop com.nexuslock || true
adb_device shell am start --user 0 -n com.nexuslock/.MainActivity >/dev/null
sleep 6

echo "Starting scrcpy (gamepad=$GAMEPAD_MODE) ..."
scrcpy --gamepad="$GAMEPAD_MODE" --window-title="Nexus gamepad test" \
  >"$OUT/scrcpy.log" 2>&1 &
SCRCPY_PID=$!
sleep 2

snap() {
  adb_device exec-out screencap -p >"$OUT/$1.png"
  echo "  screenshot: $OUT/$1.png"
}

focus() {
  adb_device shell rm -f /sdcard/window.xml
  adb_device shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || true
  local xml ids
  xml="$(adb_device shell cat /sdcard/window.xml 2>/dev/null || true)"
  if [[ -z "$xml" ]]; then
    echo "  focus: <dump unavailable>"
    return
  fi
  ids="$(echo "$xml" | tr '>' '\n' \
    | grep 'selected="true"' \
    | sed -E 's/.*resource-id="([^"]*)".*/\1/' | paste -sd',' - || true)"
  echo "  focus: ${ids:-<none>}"
}

send() {
  echo "  keyevent $2"
  adb_device shell input keyevent "$1"
  sleep 1
}

echo "== GAMES tab =="
send KEYCODE_BUTTON_R1 R1
sleep 2
snap 01-games

echo "== focus movement =="
send KEYCODE_DPAD_DOWN down
focus
snap 02-down
send KEYCODE_DPAD_RIGHT right
focus
snap 03-right
send KEYCODE_DPAD_LEFT left
focus
snap 04-left
send KEYCODE_DPAD_UP up
focus
snap 05-up
send KEYCODE_DPAD_DOWN down
focus
snap 06-down

echo "== A (launch focused game) =="
send KEYCODE_BUTTON_A A
sleep 1
echo "  top: $(adb_device shell dumpsys activity activities \
  | grep -m1 topResumedActivity | sed -E 's/.* u0 ([^ ]+).*/\1/')"
adb_device shell am start --user 0 -n com.nexuslock/.MainActivity >/dev/null
sleep 4
snap 07-after-a

echo "== shoulders =="
send KEYCODE_BUTTON_L1 L1
snap 08-desktop
send KEYCODE_BUTTON_R1 R1
snap 09-games

echo "== Start / B =="
send KEYCODE_BUTTON_START Start
snap 10-settings
send KEYCODE_BUTTON_B Back
snap 11-home

echo "== Select / B =="
send KEYCODE_BUTTON_SELECT Select
snap 12-apps
send KEYCODE_BUTTON_B Back
snap 13-home

echo "== Lock screen =="
adb_device shell input keyevent KEYCODE_SLEEP
sleep 2
adb_device shell input keyevent KEYCODE_WAKEUP
sleep 5
snap 14-lock
send KEYCODE_DPAD_LEFT left
snap 15-lock-flashlight
send KEYCODE_DPAD_RIGHT right
snap 16-lock-unlock
send KEYCODE_BUTTON_A A
sleep 2
snap 17-unlocked-home

echo "Done. Review screenshots in $OUT"
