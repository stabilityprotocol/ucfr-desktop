# UCFR Desktop

Mocked Electron + React desktop shell that follows the API surface defined in `openapi.yml`. The app ships with fake authentication, settings, and watcher flows so you can experiment with the renderer UI and IPC messages without a backend.

## Prerequisites
- Node.js 18+ recommended.
- Yarn Berry (v4) with the `node-modules` linker (configured in `.yarnrc.yml`).

If you do not have Yarn v4 yet, install it via:
```bash
yarn set version 4.3.1
```

## Install dependencies
The repository uses Plug'n'Play disabled (`node-modules` linker), so the usual `node_modules` directory will be created.
```bash
yarn install
```

## Run the app in development
Starts Vite for the renderer and Electron (with ts-node) for the main process, waiting for the renderer to be ready.
```bash
yarn dev
```
The app will open an Electron window connected to `http://localhost:5173`.

### Run renderer only
If you just want to iterate on the React UI in the browser:
```bash
yarn renderer
```
Then open `http://localhost:5173` in your browser.

### Run main process only
To run only the Electron main process against an already running renderer:
```bash
yarn main
```

## Build the renderer
A production build of the React renderer can be produced with:
```bash
yarn build:renderer
```

## Project structure
- `src/main`: Electron main process, IPC handlers, tray, token store, settings, and folder watcher mocks.
- `src/preload`: Preload script that exposes safe IPC bridges to the renderer.
- `src/renderer`: React UI powered by Vite, Jotai, and React Query.
- `src/shared`: Shared types and mock API helpers.
- `openapi.yml`: API shape used to align the mocked flows.
- `DEFINITION.md`: Reference for the app definition and requirements.

## Notes on the mocks
All authentication, settings, and watcher interactions are fake; state is kept in-memory or persisted locally via `electron-store` for tokens. Adjust the mock implementations in `src/shared/api/mockApi.ts` or the IPC handlers in `src/main/ipc.ts` as you start wiring real backend calls.
