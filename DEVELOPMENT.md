# Development Guide

## Prerequisites

- **Node.js** 18 or later
- **Yarn Berry** v4 with the `node-modules` linker (already configured in `.yarnrc.yml`)

If you don't have Yarn v4 yet:

```bash
corepack enable
yarn set version 4.3.1
```

## Getting started

```bash
# Install dependencies
yarn install

# Start the app in development mode
yarn dev
```

`yarn dev` runs three things concurrently:

1. Vite dev server for the renderer (`http://localhost:5173`)
2. TypeScript watcher for the preload script
3. Electron main process (via `ts-node`, restarts on changes)

### Renderer only

To iterate on the React UI in a browser without Electron:

```bash
yarn renderer
```

Then open `http://localhost:5173`.

### Main process only

To run Electron against an already-running Vite dev server:

```bash
yarn main
```

## Project structure

```
src/
  main/              Electron main process
    main.ts            App lifecycle, window, tray, deep links
    ipc.ts             All IPC handlers
    autoUpdater.ts     Auto-update logic (electron-updater)
    db/                SQLite database (better-sqlite3 + drizzle-orm)
    watcher.ts         File system watcher (chokidar)
    artifactService.ts Artifact creation on file changes
    fileHistory.ts     File change tracking
    tokenStore.ts      JWT token persistence
    settings.ts        App settings
    configStore.ts     Key-value config storage
    imageTransformService.ts  Image processing (sharp)

  preload/           Context-isolated bridge between main and renderer
    index.ts           Exposes window.ucfr API

  renderer/          React UI (Vite + Tailwind v4 + Jotai)
    App.tsx            Root component, auth gating, routing
    components/        Reusable UI components
    pages/             Route pages (Dashboard, Marks, Settings, etc.)
    hooks/             Custom React hooks
    state.ts           Jotai atoms
    style.css          Global styles and CSS variables

  shared/            Code shared between main and renderer
    api/               API client, types, auth helpers

  server/            Embedded database server (Express + PGlite)
  assets/            Icons and branding
```

## Build scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Full development mode (renderer + main + preload watcher) |
| `yarn renderer` | Vite dev server only |
| `yarn main` | Electron main process only |
| `yarn build` | Full production build (clean, icons, preload, renderer, main, electron-builder) |
| `yarn build:renderer` | Production build of the React renderer |
| `yarn build:main` | Compile main process TypeScript |
| `yarn build:preload` | Compile preload script |
| `yarn build:icons` | Generate platform icons from source image |
| `yarn clean` | Remove compiled output |
| `yarn db:generate` | Generate drizzle migration files |
| `yarn db:migrate` | Run pending drizzle migrations |
| `yarn db:studio` | Open drizzle studio |

## Architecture notes

### IPC pattern

All communication between the renderer and main process goes through the preload bridge:

```
Renderer (window.ucfr.*)  →  Preload (ipcRenderer.invoke)  →  Main (ipcMain.handle)
```

Events flow in the opposite direction via `webContents.send` and `ipcRenderer.on`.

### Database

SQLite via `better-sqlite3` + `drizzle-orm`. Data directory is in the user's home folder. Tables include `files`, `file_history`, `config`, and `watched_folders`.

Migration files live in `drizzle/` and are bundled as extra resources in production builds.

### Auto-update

Uses `electron-updater` with GitHub Releases as the update source.

- Checks for updates 30 seconds after launch and every 4 hours
- Minor and patch updates are downloaded automatically in the background
- Major version bumps show a banner prompting the user to download a fresh installer
- Update status is forwarded to the renderer via the `update:status` IPC channel

### File watching

`chokidar` watches folders assigned to marks. File events are debounced (500ms) to coalesce rapid add+change sequences, then processed sequentially to avoid database race conditions.

## Releasing a new version

1. Bump the version in `package.json` (e.g. `0.1.0` to `0.2.0`)
2. Commit the change
3. Create a git tag matching the version:
   ```bash
   git tag v0.2.0
   ```
4. Push the commit and tag:
   ```bash
   git push origin main --tags
   ```
5. CI detects the `v*.*.*` tag and builds all platforms with `--publish always`
6. `electron-builder` creates (or updates) a GitHub Release with the installers and `latest*.yml` manifests
7. Running instances of the app will detect the new version and auto-update

Non-tag pushes to `main` still build all platforms but publish as draft releases for testing.

## Code signing

### macOS

Fully configured. CI uses these secrets:

- `CSC_LINK` -- Code signing certificate (p12)
- `CSC_KEY_PASSWORD` -- Certificate password
- `APPLE_ID` -- Apple Developer account email
- `APPLE_APP_SPECIFIC_PASSWORD` -- App-specific password for notarization
- `APPLE_TEAM_ID` -- Apple Developer Team ID

### Windows

Not yet configured. Unsigned builds will trigger SmartScreen warnings.

### Linux

No signing (standard practice).
