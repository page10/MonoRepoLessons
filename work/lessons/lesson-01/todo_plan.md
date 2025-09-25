# TODO TUI — Implementation Plan (TODO-PLAN.md)

_Companion to **TODO-DESIGN.md**. This plan breaks work into phases, defines the file structure, and enumerates risks, acceptance criteria, and step‑by‑step execution to build a multi‑panel blessed + TypeScript MVC app._

---

## 0) Assumptions for v1 (can revise later)
- Storage: **JSON** default; SQLite deferred to stretch.
- Recurrence: spawn next **on completion**; missed tasks remain overdue.
- Search: strict filters by default; **fuzzy** optional via `fuse.js`.
- Description: plain text **with markdown allowed** (render preview added in stretch).
- Priority scale: **0–3**.
- Theming: ship **dark**, **light**, **high‑contrast**.
- Telemetry: **off** by default; opt‑in perf diagnostics only.

---

## 1) Phased Roadmap (with deliverables & acceptance criteria)

### **Phase M0 — Project Scaffold (Day 1–2)**
**Goals**: reliable toolchain, CI, lint, test harness, baseline types.

**Tasks**
- Init repo; Node ≥18; TS ≥5.
- `tsconfig.json`, `eslint` (typescript), `prettier`.
- Test runner: `vitest` (or `jest`), `ts-node` for dev.
- Scripts: `dev`, `build`, `start`, `test`, `lint`, `format`.
- Minimal `types/` with `UUID`, `Priority`, `Status`.
- CI (GitHub Actions): build + test on Linux/Windows/macOS.

**Acceptance**
- `npm run build` outputs `dist/` without errors.
- CI green across 3 OSes.

---

### **Phase M1 — Core Domain & Persistence (Days 3–6)**
**Goals**: Model + validation + JSON storage + Event/Command buses.

**Tasks**
- Implement Zod schemas for `TodoItem`, `List`, `AppState`.
- `EventBus` (typed pub/sub) and `CommandBus` (undo/redo, atomic batch).
- JSON storage driver with crash‑safe temp+rename; daily backups.
- Migrations framework (`version`ed state with stepwise scripts).
- Repositories: `TodoRepository`, `ListRepository` with in‑memory indexes.

**Acceptance**
- Unit tests: CRUD, validation failures, migration from v0→v1.
- Crash simulation test confirms recovery from `db.log`.

---

### **Phase M2 — View Shell & Layout (Days 7–9)**
**Goals**: blessed root, 3‑panel layout, status bar, theming.

**Tasks**
- `RootLayout` with Sidebar, TodoList, Detail panels; status bar.
- Theme system (light/dark/high‑contrast) and border styles.
- Focus model (one focused panel); resize handling; min widths.

**Acceptance**
- App launches; panels render placeholders; focus cycles with `Tab`/`Shift+Tab` and `1/2/3`.

---

### **Phase M3 — Controllers & Keymap (Days 10–12)**
**Goals**: AppController, per‑panel controllers, configurable keymap.

**Tasks**
- `AppController` manages focus, modal stack, routing.
- Keymap service (load `config/keymap.json`; context‑scoped bindings).
- Controllers: `SidebarController`, `TodoListController`, `DetailController` (stubs wired to model events).

**Acceptance**
- Keybindings invoke no‑op handlers; visual hints appear in status bar.

---

### **Phase M4 — CRUD End‑to‑End (Days 13–17)**
**Goals**: Create, edit, delete todos & lists; persistence; undo/redo.

**Tasks**
- Command handlers: `createTodo`, `updateTodo`, `toggleDone`, `moveToList`, `deleteTodo`, `createList`, `renameList`.
- Inline create in TodoList; basic edit in Detail panel; validation errors surfaced.
- Undo/redo stack with combined batches.

**Acceptance**
- E2E: create → edit → complete → undo/redo across app restarts.

---

### **Phase M5 — Filtering & Search (Days 18–21)**
**Goals**: Filter AST, query pipeline, optional fuzzy search.

**Tasks**
- Parse query string (e.g., `tag:work status:open due<today`).
- Build view pipeline: filter → sort → group → paginate.
- Debounce input; background compute; show live counts.
- Integrate `fuse.js` for fuzzy (toggle in search panel).

**Acceptance**
- Typing `tag:home` narrows list; performance stays smooth (>60 fps feel; low reflow counts).

---

### **Phase M6 — Power‑User Interactions (Days 22–25)**
**Goals**: multi‑select, batch ops, grouping, virtualized list.

**Tasks**
- Selection model (single, range, multi with Space).
- Batch commands: `bulkApply`, `archiveDone`, `setPriority` multi.
- Grouping by due date/priority; collapse/expand groups.
- Virtualization: render visible rows only.

**Acceptance**
- 10k todos scroll smoothly; CPU within budget; grouping toggles instantly.

---

### **Phase M7 — Detail Panel Polish (Days 26–29)**
**Goals**: subtasks, recurrence, date pickers, markdown preview (optional).

**Tasks**
- Subtask CRUD + drag/reorder (keyboard‑driven: Alt+Up/Down).
- Recurrence model + command to spawn next on complete.
- Date picker popover; quick presets (today/tomorrow/next week).
- Optional markdown preview toggle in detail panel.

**Acceptance**
- Completing a recurring task spawns the next with correct dates and history link.

---

### **Phase M8 — Import/Export, Backups (Days 30–32)**
**Goals**: CSV/JSON/todo.txt import; JSON/CSV export; backup UI.

**Tasks**
- Import wizards with preview and mapping (columns → fields).
- Export current view to CSV/JSON.
- Backup rotation config; restore flow from in‑app Log/Console.

**Acceptance**
- Round‑trip CSV → app → CSV preserves essential fields.

---

### **Phase M9 — Testing & QA Hardening (Days 33–36)**
**Goals**: solid unit/integ/E2E; snapshot frames; perf regression guard.

**Tasks**
- Golden frame tests for panels (ANSI snapshots).
- PTY‑driven E2E scripts (spawn app, send keys, assert state).
- Load test fixtures (50k todos) + performance counters.

**Acceptance**
- CI runs tests on 3 OSes; perf budget not exceeded; no flaky tests.

---

### **Phase M10 — Packaging & Release (Days 37–38)**
**Goals**: CLI package, docs, versioning, changelog.

**Tasks**
- `bin: todo-tui` entry; README quickstart.
- Optional single‑binary bundles via `pkg`/`nexe`.
- Semantic versioning; changelog; license.

**Acceptance**
- `npm i -g` installs and launches; or binary runs standalone.

---

## 2) File Structure (finalized for v1)
```
/ (repo root)
├─ package.json
├─ tsconfig.json
├─ vitest.config.ts
├─ .eslintrc.cjs
├─ .prettierrc
├─ /src
│  ├─ /core
│  │  ├─ EventBus.ts
│  │  ├─ CommandBus.ts
│  │  ├─ Scheduler.ts
│  │  ├─ Logger.ts
│  │  └─ Keymap.ts
│  ├─ /model
│  │  ├─ types.ts
│  │  ├─ schemas.ts (zod)
│  │  ├─ AppState.ts
│  │  ├─ repositories/
│  │  │  ├─ TodoRepository.ts
│  │  │  └─ ListRepository.ts
│  │  ├─ queries/
│  │  │  ├─ FilterAST.ts
│  │  │  ├─ Pipeline.ts
│  │  │  └─ SearchIndex.ts
│  │  └─ migrations/
│  │     ├─ 000-init.ts
│  │     └─ 001-...ts
│  ├─ /controller
│  │  ├─ AppController.ts
│  │  ├─ SidebarController.ts
│  │  ├─ TodoListController.ts
│  │  ├─ DetailController.ts
│  │  └─ SearchController.ts
│  ├─ /view
│  │  ├─ RootLayout.ts
│  │  ├─ panels/
│  │  │  ├─ SidebarPanel.ts
│  │  │  ├─ TodoListPanel.ts
│  │  │  ├─ DetailPanel.ts
│  │  │  ├─ HelpPanel.ts
│  │  │  └─ LogPanel.ts
│  │  ├─ widgets/
│  │  │  ├─ StatusBar.ts
│  │  │  ├─ Toast.ts
│  │  │  └─ Inputs.ts
│  │  └─ theme/
│  │     ├─ dark.ts
│  │     ├─ light.ts
│  │     └─ highContrast.ts
│  ├─ /storage
│  │  ├─ JsonDriver.ts
│  │  ├─ Backup.ts
│  │  └─ ImportExport.ts
│  ├─ /config
│  │  ├─ defaults.ts
│  │  └─ keymap.json
│  ├─ /cli
│  │  └─ index.ts (bootstraps app)
│  └─ /types (shared)
│     └─ index.d.ts
├─ /test
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
└─ /dist (build output)
```

---

## 3) Step‑by‑Step Build Guide (developer checklist)

1. **Scaffold**: run `npm init -y`; add TS, Vitest, ESLint; configure `paths` and strict mode.
2. **Types & Schemas**: define domain types; write Zod schemas & tests.
3. **Event/Command Buses**: implement, with typed events and inverse commands for undo.
4. **Repositories**: CRUD + indexes; wire to buses; add unit tests.
5. **Storage (JSON)**: load → validate → migrate → in‑mem; write via temp+rename; backup snapshots; tests.
6. **RootLayout**: bootstrap blessed screen; 3 panels; status bar; focus manager.
7. **Keymap**: register global + context handlers; status hints.
8. **Controllers**: wire Sidebar/TodoList/Detail to repos via CommandBus.
9. **CRUD Flows**: inline create/edit, detail edit, list admin; toast feedback; undo/redo.
10. **Filter/Search**: parse query; pipeline; results feed TodoList; debounce.
11. **Virtualization**: only render visible rows; confirm smooth scroll with large fixture.
12. **Power ops**: multi‑select; batch commands; grouping expand/collapse.
13. **Detail polish**: subtasks reordering; recurrence; date picker; markdown preview (optional toggle).
14. **Import/Export**: CSV/JSON/todo.txt; wizards with validation; tests.
15. **QA & Perf**: golden frame tests, PTY scripts, perf counters; fix hot paths.
16. **Package**: bin entry; README; version tagging; optional single‑binary bundle.

---

## 4) Key Interfaces (signatures)

```ts
// core/EventBus
export type EventMap = {
  'todo:created': { id: UUID };
  'todo:updated': { id: UUID; patch: Partial<TodoItem> };
  'todo:deleted': { id: UUID };
  'ui:focusChanged': { panel: 'sidebar'|'todos'|'detail' };
};
export interface EventBus { on<T extends keyof EventMap>(t: T, h: (e: EventMap[T]) => void): void; emit<T extends keyof EventMap>(t: T, e: EventMap[T]): void; }

// core/CommandBus
export interface Command<I = unknown, O = unknown> { do(input: I): O; undo(): void; }
export interface CommandBus { run<C extends Command<any, any>>(c: C): ReturnType<C['do']>; undo(): void; redo(): void; batch(run: () => void): void; }
```

---

## 5) Potential Challenges & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Blessed reflow slowness** on large lists | Jank/lag | Virtualization; diff rendering; batch CommandBus updates; throttle search. |
| **Windows keybinding quirks** | Broken shortcuts | Provide alternates; detect terminal; document OS‑specific keys. |
| **Unicode width / CJK** | Misaligned columns | Use `string-width` utility; avoid naive `.length`; test with wide chars. |
| **Data corruption on crash** | Data loss | temp+rename, journaling `db.log`, daily backups, recovery flow. |
| **Schema evolution** | Upgrade failures | Versioned migrations with property tests; snapshot backups pre‑migrate. |
| **Fuzzy search perf** | Slow typing | Debounce; cap index fields; cache results per query; toggle off by default. |
| **Focus/selection desync** | UX bugs | Single source of truth for focus; invariant tests; controller state machines. |
| **Terminal size constraints** | Cramped UI | Minimum panel widths; collapsible sidebar; hide detail on narrow screens. |

---

## 6) Performance Budget & Instrumentation
- Target: **<16ms** average render on list ops; **<50ms** on bulk ops.
- Counters: reflow count per keypress; render time per panel; list virtualization hit rate.
- `--profile` flag dumps CSV to `/tmp/todo-tui-profile-*.csv`.

---

## 7) Testing Strategy Details
- **Unit**: repositories, schemas, command inverses.
- **Integration**: storage + migrations + repositories.
- **View**: capture ANSI frames after scripted interactions; compare snapshots.
- **E2E**: spawn pseudo‑tty, send key sequences, assert persisted state.

---

## 8) Definition of Done (per feature)
- Code + tests (≥80% branch coverage for model/controllers).
- Keyboard accessibility verified on Linux/macOS/Windows.
- Docs: user‑visible keymap & short help text.
- No perf regressions vs. baseline.

---

## 9) Work Breakdown by Role (if team of 2–3)
- **Core/Model lead**: schemas, repos, migrations, storage, command bus.
- **UI/Controller lead**: blessed layout, controllers, keymap, interaction flows.
- **QA/Perf**: test infra, e2e scripts, perf tracing, CI triage.

---

## 10) Timeline Snapshot (single dev, ~38 days)
- M0–M1: Days 1–6
- M2–M3: Days 7–12
- M4: Days 13–17
- M5–M6: Days 18–25
- M7–M8: Days 26–32
- M9–M10: Days 33–38

---

## 11) Quick Start Scripts (package.json excerpt)
```json
{
  "scripts": {
    "dev": "ts-node src/cli/index.ts",
    "build": "tsc -p .",
    "start": "node dist/cli/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint --ext .ts src",
    "format": "prettier -w ."
  }
}
```

---

## 12) Next Edits After Your Feedback
- Toggle assumptions based on product decisions (storage, recurrence, search default).
- Add SQLite backend tasks if promoted to v1.
- Expand import/export matrix to include your preferred formats.
