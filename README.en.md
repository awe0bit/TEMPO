<p align="center">
  <img src="apps/flutter/assets/branding/tempo-icon-master-black.png" width="112" alt="Tempo app icon">
</p>

<h1 align="center">Tempo</h1>

<p align="center"><a href="README.md">简体中文</a> · <strong>English</strong></p>

<p align="center"><strong>Time. Everything. Moments. Productivity. Organized.</strong></p>

<p align="center">A local-first personal workspace for tasks, focus, RSS, and self-hosted sync.</p>

<p align="center">
  <a href="https://todo.darker.one/en/">Documentation</a> ·
  <a href="https://github.com/awe0bit/TEMPO/releases/latest">Download</a> ·
  <a href="docs/en/DEPLOYMENT.md">Deploy sync</a>
</p>

## What Tempo does

- **Tasks and Inbox:** capture ideas quickly, plan today, group work into projects, and keep completed items available.
- **Calendar:** switch naturally between week and month views while keeping tasks and dates together.
- **Focus:** use Pomodoro stages or a count-up timer, with goals and focus history.
- **RSS:** organize sources, search articles, read offline, save favorites, translate content, and create AI summaries.
- **Cross-device sync:** synchronize tasks, focus history, and RSS state through your own server.
- **Apple system features:** use Home Screen and Lock Screen widgets, Live Activities, and Dynamic Island on supported devices.
- **Chinese and English UI:** iOS follows the system language and can be overridden in **Settings → Tempo → Language**.
- **Offline first:** core features continue to work when the server or network is unavailable.

## Download and install

Public builds are available on [GitHub Releases](https://github.com/awe0bit/TEMPO/releases). Download the file whose name matches your platform:

| Platform | Download | Notes |
| --- | --- | --- |
| iOS | `TEMPO-<version>-iOS-unsigned.ipa` | Sign locally with your Apple identity; keep the widget extension and App Group entitlements |
| macOS | `.zip` or `.dmg` | The current build is not notarized, so macOS may ask for confirmation |
| Android | `.apk` | Android handles installation and compatible in-place updates |
| Windows | portable `.zip` or setup `.exe` | Windows may show a SmartScreen warning for unsigned builds |

Platforms are released independently, so the newest release may not contain all four builds. **Settings → About Tempo** automatically finds the latest build for the current platform.

## Use Tempo

1. Install the client for your device.
2. Start using tasks, calendar, focus, and RSS locally; no server is required.
3. To sync multiple devices, deploy the lightweight sync service and enter the same server URL and sync token on each device.
4. Configure optional AI, weather, notifications, and RSS preferences in Settings.

See the [configuration guide](docs/en/CONFIGURATION.md) and [self-hosted deployment guide](docs/en/DEPLOYMENT.md) for details.

## Updates

Open **Settings → About Tempo** to check for a new native build. Compatible iOS page content can update automatically through OTA; changes to native navigation, permissions, widgets, or Dynamic Island still require installing a newer IPA.

## License

Tempo is released under the [GNU GPL v3](LICENSE). The Android client is based on the MIT-licensed Flowtime project; its original license is preserved in `apps/android/FLOWTIME_LICENSE`.
