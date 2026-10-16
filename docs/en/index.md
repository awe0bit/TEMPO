# Tempo documentation

Tempo is a personal, local-first task and focus app for iPhone, Android, Mac, and Windows. Your data stays on each device by default; connect your own server when you want real-time sync.

## What Tempo does

- Capture tasks in the Inbox and organize what matters today.
- Browse a weekly or monthly calendar without leaving the task view.
- Run Pomodoro sessions or a count-up focus timer.
- Read, search, save, translate, and summarize RSS articles.
- Keep tasks, focus history, and RSS state in sync across your devices.
- Show focus progress through iOS widgets, Lock Screen Live Activities, and Dynamic Island.

Tempo works offline. Sync and AI features are optional, and you can host the sync service on your own server.

## Get started

| Goal | Guide |
| --- | --- |
| Run your own sync server | [Self-hosted sync](/en/DEPLOYMENT) |
| Configure clients and integrations | [Configuration](/en/CONFIGURATION) |
| Download the latest build | [GitHub Releases](https://github.com/awe0bit/Tempo/releases/latest) |

Install the file whose name matches your platform. Releases are platform-specific, so the newest release may not contain builds for every platform. The in-app **Settings → About Tempo** page automatically finds the latest compatible build for the current device.

The public iOS IPA is unsigned. Sign it locally with your own Apple identity and keep the main app, widget extension, and App Group entitlements intact.

## Fast path

1. Install Docker and Docker Compose on a Linux server.
2. Copy `.env.example` to `.env`.
3. Generate a 64-character hexadecimal `SYNC_TOKEN`.
4. Start the service and place it behind HTTPS.
5. Enter the same server URL and token on every device.

Tempo is designed for one person. Do not share the same endpoint and token with unrelated users.

## Updates

Compatible iOS page content can update automatically through OTA. Changes to native navigation, permissions, widgets, or Dynamic Island still require installing a newer IPA. Android, Windows, and macOS updates use the normal download and replacement flow for each platform.
