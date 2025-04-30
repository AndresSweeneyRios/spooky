#!/usr/bin/env bash
set -e

# URL to open
URL="https://tripshred.com/crazeoh/#/crazeoh"

# Detect platform
OS="$(uname -s)"
case "$OS" in
  Darwin*) PLATFORM="macos" ;;
  Linux*)  PLATFORM="linux" ;;
  *)       PLATFORM="unknown" ;;
esac

# Helper: try a command and exit on success
try_and_exit() {
  cmd="$1"
  shift
  if command -v "${cmd%% *}" &>/dev/null; then
    # on macOS, alias the app name for 'open -a'
    if [[ "$PLATFORM" == "macos" ]]; then
      open -a "${cmd%% *}" --args "$@"
    else
      eval "$cmd \"$URL\""
    fi
    exit 0
  fi
}

# macOS: use 'open -a' with the right app name and flags
if [[ "$PLATFORM" == "macos" ]]; then
  # Chromium‐based browsers (–app flag)
  try_and_exit "Google Chrome" --app
  try_and_exit "Google Chrome Canary" --app
  try_and_exit "Chromium" --app
  try_and_exit "Brave Browser" --app
  try_and_exit "Microsoft Edge" --app

  # Firefox in kiosk (full-screen) mode
  try_and_exit "Firefox" --kiosk
  echo "No supported browser found on macOS."
  exit 1
fi

# Linux: test for known executables and flags
if [[ "$PLATFORM" == "linux" ]]; then
  # Chromium‐based app mode
  try_and_exit "google-chrome-stable --app"
  try_and_exit "google-chrome --app"
  try_and_exit "chromium-browser --app"
  try_and_exit "chromium --app"
  try_and_exit "brave-browser --app"
  try_and_exit "brave --app"
  try_and_exit "microsoft-edge --app"
  try_and_exit "edge --app"

  # Firefox kiosk
  try_and_exit "firefox --kiosk"

  echo "No supported browser found on Linux."
  exit 1
fi

# Fallback for unknown platforms
echo "Unsupported platform: $OS"
exit 1
