# PROJECTS.md

A quick map of what lives where in this workspace.

## Tracks

### Lattice plugins
- Repo/folder: `/Users/minion/.openclaw/workspace/projects/subscribify`
- Plugin: `lattice-subscriptions.php` ("Lattice Subscriptions")
- Purpose: WooCommerce subscription product type + subscription CPT + My Account UI + renewal scheduler.
- Status: discovered; 1 small fix landed locally (cron cleanup on deactivate).
- Notes: Branch observed: `lattice-rename`.

### VidAI
- Repo/folder: `/Users/minion/.openclaw/workspace/projects/videogen`
- Purpose: FastAPI + Celery pipeline that generates videos (images + voiceovers + ffmpeg), with Next.js frontend (`frontend/`) and legacy UI (`frontend-old/`).
- Status: discovered; PR opened to fix voice/video_style/aspect_ratio not being submitted from new frontend.
- Notes:
  - Old frontend: vidai.kayorama.nl
  - New frontend: https://sokckc4woc0c8so80sgcs48o.kayorama.nl
  - PR: https://github.com/kaygaaf/videogen/pull/18

## Conventions
- When a new project is added, record:
  - folder path
  - primary branch
  - how to run/test/build
  - key env vars/secrets (names only; don’t paste secrets)
