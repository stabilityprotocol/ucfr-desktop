————————

1. Goals
   • Cross-platform desktop app (Windows + macOS) using Electron
   • Minimal React + TypeScript UI
   • Tray app running in background
   • Folder monitoring (chokidar)
   • On file changes, send events to backend API (fetch)
   • Authentication through external service and token capture
   • Token stored securely via keytar
   • State management with Jotai + TanStack Query for server fetching

⸻

2. Tech Stack
   • Electron (main)
   • React + Vite + TypeScript (renderer)
   • chokidar (folder watching)
   • keytar (secure token storage)
   • electron-store (persistent settings)
   • Jotai (local/UI state)
   • TanStack Query (server state and fetch wrappers)
   • fetch (HTTP client)
   • electron-builder (packaging)

⸻

3. Architecture Overview
   MAIN PROCESS:
   • Tray icon + menu
   • Folder watcher
   • Background API sync
   • Token storage in keytar
   • Auto-start at login
   • IPC handlers for calling from renderer

RENDERER (React):
• Minimal UI: last events, sync status, settings
• Jotai for local state (folder path, logs, UI flags)
• React Query for server state (backend status, auth/me, etc.)
• Communicates via preload IPC bridge

SHARED:
• Common TypeScript interfaces
• IPC channels

⸻

4. Authentication Flow
   1. User triggers login (or missing token).
   2. Electron opens login window pointing to auth service.
   3. Auth service redirects to: myapp://auth?token=XXXX
   4. Electron handles custom protocol, extracts token.
   5. Store token with keytar.
   6. Notify renderer via tokenChanged IPC event.
   7. Renderer sets tokenAtom and invalidates relevant React Query caches.

⸻

5. Folder Monitoring
   • chokidar.watch() runs in the main process.
   • Watches add, change, unlink, rename events.
   • Each event -> build payload -> call backend with fetch.
   • On success/failure:
   • update tray menu status
   • send logEvent IPC to renderer
   • send syncStatus IPC to renderer
   • Optional: debounce/batch events.

⸻

6. API Layer (fetch + React Query)
   • fetch wrapper used in both main (for uploads) and renderer (for queries).
   • React Query used for:
   • backend status
   • auth/me validation
   • any server data shown in UI
   • Queries use fetch with automatic token injection via IPC call to main.

⸻

7. State Management (Jotai)
   Jotai atoms in renderer:
   • tokenAtom
   • logsAtom
   • folderAtom
   • autoStartAtom
   • syncStatusAtom
   • UI atoms (active tab, etc.)

IPC updates these atoms from main process.

⸻

8. Tray Integration
   Tray menu includes:
   • Open App
   • Last sync result
   • Re-authenticate
   • Quit

Tray updates when main receives sync events.

⸻

9. Settings
   Stored in electron-store:
   • monitored folder path
   • auto-start enabled flag
   • UI prefs

Renderer:
• Jotai atoms mirror these settings
• Cache updated via IPC when changed

⸻

10. Auto-Start
    • Uses app.setLoginItemSettings (mac + Win)
    • Toggle available in UI
    • Stored persistently

⸻

11. Packaging
    • Use electron-builder
    • macOS: DMG
    • Windows: NSIS installer
    • Add icons for both platforms

⸻

12. IPC Contract

Renderer → Main:
• auth/getToken
• auth/clearToken
• auth/startLoginFlow
• settings/get
• settings/set
• folder/select
• app/toggleAutoStart

Main → Renderer:
• logEvent
• tokenChanged
• syncStatus
• settingsChanged

⸻

13. Security
    • Token stored only in keytar (never localStorage)
    • Renderer cannot access Node directly (no NodeIntegration)
    • Limited IPC surface
    • HTTPS only
    • CSP for renderer UI
    • Disable remote module

⸻

14. Milestones

M1 — Foundation: Electron + Vite + TS, Jotai, tan stack Query, IPC
M2 — Auth system working with token in keytar
M3 — Folder watcher + event API calls
M4 — UI dashboard + settings + auto-start
M5 — Packaging for macOS and Windows
