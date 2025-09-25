# TODO TUI — Design Document

A multi‑panel terminal UI (TUI) Todo Manager built with **TypeScript** and **blessed**, organized with an **MVC architecture**. This document specifies the architecture, UI layout, data model, and technical requirements.

---

## 1) System Architecture Overview

### 1.1 Goals
- Fast, keyboard-first productivity in the terminal.
- Clear separation of concerns via MVC.
- Extensible panels (pluggable views/controllers) and storage backends.
- Robust persistence with minimal data loss (crash‑safe writes).

### 1.2 MVC Rationale
- **Model**: Pure application state and domain logic (todos, lists, filters, search index). Testable, framework‑free.
- **View**: TUI components built with blessed. No business logic; subscribes to model state and renders.
- **Controller**: Maps user input and system events to model mutations and view commands. Encapsulates navigation, routing, and keybindings.

**Benefits**: Improved testability, simpler reasoning about state transitions, parallel development of UI panels and core logic, and future portability (e.g., Web or GUI front‑ends) by keeping the Model independent.

### 1.3 High-Level Modules
- **Core**
  - `EventBus` (typed pub/sub)
  - `CommandBus` (imperative commands; undo/redo)
  - `Clock` & `Scheduler` (reminders, periodic refresh)
  - `ConfigService` (user config, keymaps, theme)
  - `Telemetry` (optional metrics/debug logging)
- **Model Layer**
  - `TodoRepository` (CRUD, queries, filters)
  - `ListRepository` (projects/labels/inboxes)
  - `TagRepository`
  - `SearchIndex` (fuzzy search cache)
  - `SyncService` (optional: file sync / VCS / remote)
- **Controller Layer**
  - `AppController` (routing, global shortcuts)
  - `PanelControllers` (per‑panel logic)
  - `CommandHandlers` (create/edit/delete/move, etc.)
- **View Layer (blessed)**
  - `RootLayout` (multi‑panel grid, status bar)
  - `Panels` (List, Todo, Detail/Inspector, Filter/Search, Log/Console, Help/Keymap)
  - `Widgets` (inputs, popovers, toasts)
- **Persistence**
  - `Storage` drivers: JSON file (default), SQLite (optional), custom (plugin).
  - Crash‑safe write via temp+rename and journaling.

### 1.4 Process & Event Flow
```
┌──────────┐   keys/clicks   ┌───────────────┐   commands   ┌──────────┐
│  View    │ ───────────────▶│  Controller   │─────────────▶│  Model    │
│ (blessed)│◀──────── render └───────────────┘◀─────────────└──────────┘
└──────────┘   change events        ▲      ▲       domain events     │
     │                               │      │                        │
     ▼ toast/notify                  │      │                        ▼
┌─────────────┐  status updates  ┌───────────┐  pub/sub        ┌───────────┐
│ Status Bar  │◀─────────────────│ EventBus  │────────────────▶│ Other Ctl │
└─────────────┘                  └───────────┘                 └───────────┘
```

### 1.5 Concurrency & Consistency
- Single‑threaded Node event loop with queued command execution.
- All mutations go through `CommandBus`; supports **undo/redo** and **atomic batches**.
- Read views subscribe to model snapshots and diff‑render.

### 1.6 Extensibility
- **Panel plugin API**: register a new panel with `id`, `title`, controller factory, and blessed view factory.
- **Storage plugin API**: implement `StorageDriver` interface.
- **Command extension**: register custom commands (e.g., `archive-done`, `snooze`).

---

## 2) User Interface Design

### 2.1 Layout Overview (Default)
```
┌─────────────── Left Sidebar ───────────────┬────────────── Todo List ──────────────┬───── Detail / Inspector ─────┐
│ [Lists/Projects] [Filters/Saved Views]     │ [Todos of selected list]              │ [Selected todo details]      │
│ [Tags]                                     │ [Sortable, groupable]                 │ [Edit pane, subtasks, notes] │
├────────────────────────────────────────────┼────────────────────────────────────────┼───────────────────────────────┤
│ ⚙ Status/Mode Bar (bottom): [mode] [filter] [search] [sync] [clock] [hint]                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Panels (baseline 3‑column)**
- **Left Sidebar Panel**: Lists/Projects, Tags, Saved Views; collapsible sections.
- **Todo List Panel**: Focused list with sorting/grouping (by due date, priority, project, tag).
- **Detail/Inspector Panel**: Full item editor, description, checklist, metadata.

**Optional/Toggle Panels**
- **Filter/Search Panel** (overlay or bottom drawer): query builder, quick filter chips.
- **Log/Console Panel**: shows recent actions, errors, sync logs.
- **Help/Keymap Panel**: modal or right drawer.

### 2.2 Panel Responsibilities
- **Left Sidebar**
  - Navigate projects/lists, multi‑select tags, save filters.
  - Context actions: create list, rename, archive, color.
- **Todo List**
  - Read‑heavy view with quick commands: complete, schedule, prioritize, tag, move.
  - Batch select (space), multi‑edit.
  - Inline create (`Enter`), inline edit (`e`).
- **Detail/Inspector**
  - Rich edit: title, description (markdown), subtasks, due/defer dates, recurrence, priority, tags, reminders, links.
  - View full change history; undo per‑field.
- **Filter/Search**
  - Structured query (e.g., `tag:work status:open due<today`) with live preview.
- **Log/Console**
  - System messages, command traces (debug mode), sync state.
- **Help/Keymap**
  - Context‑sensitive shortcut list; searchable.

### 2.3 Navigation & Interaction Patterns
- **Focus model**: exactly one panel has focus; cycling via `Tab`/`Shift+Tab` or explicit numeric keys (e.g., `1,2,3`).
- **Selection model**: list supports single and range selection (`Shift+Up/Down`), plus multi‑select with `Space`.
- **Command palette**: `Ctrl+P` (or `:`) opens command palette; fuzzy search commands.
- **Modals/Popovers**: for date pickers, tag pickers, destructive‑action confirms.
- **Toasts**: transient feedback bottom‑right.

### 2.4 Keyboard Shortcuts (default, rebindable)
| Scope | Key | Action |
|---|---|---|
| Global | `Tab` / `Shift+Tab` | Cycle focus forward/back |
| Global | `F1` / `?` | Toggle Help/Keymap panel |
| Global | `Ctrl+P` / `:` | Command palette |
| Global | `/` | Focus Search/Filter panel |
| Global | `Ctrl+S` | Save now (force flush) |
| Global | `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| Global | `Ctrl+Q` | Quit (confirm if unsaved) |
| Panel: Sidebar | `1` | Focus Sidebar |
| Panel: Todos | `2` | Focus Todo List |
| Panel: Detail | `3` | Focus Detail |
| Todos | `Enter` | Create new todo inline |
| Todos | `e` | Edit selected |
| Todos | `x` | Toggle complete |
| Todos | `p/P` | Priority down/up |
| Todos | `d` | Set due date (picker) |
| Todos | `t` | Tag picker |
| Todos | `m` | Move to list/project |
| Todos | `,` / `.` | Collapse/expand groups |
| Todos | `Space` | Multi‑select toggle |
| Detail | `Ctrl+Enter` | Save changes |
| Detail | `a` | Add subtask |
| Detail | `r` | Set recurrence |

> All bindings are configurable through `config/keymap.json`.

### 2.5 Visual & Theming
- **Themes**: light/dark plus high‑contrast. User override via config.
- **Indicators**: overdue (red sigil), due‑soon (yellow), completed (dim/strike), priority (▲ glyphs), tags (pills), recurrence (↺).
- **Status Bar**: current mode, active filter, sync icon, time, ephemeral hint for last action.

---

## 3) Data Model Specification

### 3.1 Core Types (TypeScript)
```ts
export type UUID = string;
export type Priority = 0 | 1 | 2 | 3; // 0=none, 3=highest
export type Status = 'open' | 'done' | 'archived' | 'deleted';

export interface Subtask {
  id: UUID;
  title: string;
  status: Status; // open/done
  order: number;
}

export interface Recurrence {
  rule: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval?: number; // e.g., every 2 days
  byWeekday?: number[]; // 0..6
  byMonthDay?: number[]; // 1..31
  until?: string; // ISO date
}

export interface TodoItem {
  id: UUID;
  title: string;
  description?: string; // markdown
  status: Status;
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  completedAt?: string; // ISO
  due?: string; // ISO date or datetime
  deferUntil?: string; // hide until date
  priority: Priority;
  tags: string[]; // normalized, lowercase
  listId?: UUID; // project/list
  subtasks?: Subtask[];
  recurrence?: Recurrence;
  estimateMinutes?: number;
  links?: string[]; // URLs or file refs
  metadata?: Record<string, string | number | boolean>;
}

export interface List {
  id: UUID;
  name: string;
  color?: string;
  order: number;
  archived?: boolean;
}

export interface AppState {
  todos: Record<UUID, TodoItem>;
  lists: Record<UUID, List>;
  order: UUID[]; // default ordering or current view ordering key
  version: number; // schema version for migrations
}
```

### 3.2 Validation Rules
- `title` non‑empty, trimmed; max length 300.
- `description` optional; max 20k chars; markdown sanitized for display.
- `due` and `deferUntil` must be valid ISO strings; if both present, `deferUntil <= due`.
- `priority` in 0..3.
- `tags` normalized: lowercase, no spaces (use `-` or `_`), max 24 chars/tag.
- Subtasks maintain strict increasing `order` integers starting at 0.
- Recurrence rules validated (no empty arrays; sensible interval bounds).

**Implementation**: use **Zod** schemas to validate inputs and migrations.

### 3.3 Derived/Computed Fields
- `isOverdue` = `status==='open' && due < now`.
- `nextOccurrence` computed when completing recurring tasks (auto‑spawn next).
- `visible` = `!deferUntil || now >= deferUntil`.

### 3.4 Storage & Persistence
- **Default**: single‑file JSON DB (e.g., `~/.todo-tui/db.json`).
  - Writes are buffered; commit via temp file `db.json.tmp` → fsync → atomic rename.
  - Journaling: append‑only `db.log` for recovery; compact on exit / interval.
- **Optional**: SQLite backend (`better‑sqlite3`) for large datasets and transactional safety.
- **Backups**: rotating snapshots (daily, keep last N=7).
- **Sync** (optional future): git repo integration or simple remote REST.

### 3.5 Import/Export
- **Import**: JSON, CSV (title, due, priority, tags), Todo.txt.
- **Export**: JSON, Markdown report (grouped by list/due), CSV.

### 3.6 Indexing & Query
- In‑memory indexes: by status, by listId, by tag, by due date.
- Search: fuzzy match on `title`/`description` via `fuse.js` (optional), cached per query.
- View pipeline: `filter -> sort -> group -> paginate` for efficient rendering.

### 3.7 Migrations
- `version` field in state. On load, migrate via sequential scripts; data validated after each step.

---

## 4) Technical Requirements

### 4.1 Dependencies
- **Runtime**: Node.js ≥ 18 LTS
- **Language**: TypeScript ≥ 5.x
- **TUI**: `blessed` (or `neo-blessed` if needed for performance/bug fixes)
- **Aux**:
  - `zod` (validation)
  - `date-fns` (date math)
  - `uuid` (IDs)
  - `fuse.js` (fuzzy search, optional)
  - `kleur` (CLI colors for logs)
  - `commander` or `yargs` (CLI flags)
  - `better-sqlite3` (optional storage)
  - `fs-extra` (atomic writes utilities)

### 4.2 Project Structure
```
/ src
  /core        // EventBus, CommandBus, Scheduler, logging
  /model       // domain objects, repositories, queries, migrations
  /controller  // AppController + per-panel controllers
  /view        // blessed widgets, layout, theming
  /storage     // JSON/SQLite drivers, backups, import/export
  /config      // default theme, keymap, settings
  /types       // shared TS types
  /test        // unit and integration tests
```

### 4.3 Performance Considerations
- **Diff rendering**: minimize blessed reflows; render only changed rows/cells.
- **Virtualized lists**: only visible rows; estimate row height = 1; paginate.
- **Input throttling**: debounce search/filter; coalesce rapid updates.
- **Command batching**: group multi‑edit ops into one render tick.
- **Low‑overhead logging**: opt‑in verbose traces; ring buffer for in‑app log panel.
- **Memory**: lazy load large descriptions; trim caches on panel switch.

### 4.4 Cross‑Platform Compatibility
- **Terminals**: xterm‑compatible (iTerm2, GNOME Terminal, Windows Terminal, Alacritty, kitty).
- **Windows**: ensure raw mode & key combinations work; fallback bindings for `Ctrl+[` etc.
- **Locales**: Unicode width handling (East Asian wide characters), emoji fallbacks.
- **Colors**: 256‑color baseline; detect truecolor support.
- **File paths**: use `path` utils; avoid hardcoded separators.

### 4.5 Accessibility & UX Safeguards
- High‑contrast theme; color‑only signals also have icons/glyphs.
- Optional larger text scale; disable fancy borders on small terminals.
- Confirm destructive actions; always provide Undo.

### 4.6 Testing Strategy
- **Model**: pure unit tests with fixtures; property‑based tests for migrations.
- **Controller**: simulate key events; snapshot command sequences.
- **View**: golden screenshot tests (ANSI frame captures) per panel.
- **E2E**: spawn app in pty; drive scripted sessions to validate flows.

### 4.7 Telemetry & Diagnostics (Optional)
- Anonymous performance metrics; explicit opt‑in.
- `--profile` flag to dump render timings and reflow counts.

### 4.8 Security & Privacy
- Local‑only by default; no network access unless sync is enabled.
- Config + DB stored under user home; respect file permissions.
- Redact secrets in logs; encrypt remote tokens if sync is used.

---

## 5) Controllers & Commands (Detailed)

### 5.1 AppController
- Maintains focused panel, routes global shortcuts, manages modal stack.
- Persists UI layout (panel sizes, last focused list) in config.

### 5.2 Panel Controllers (examples)
- **SidebarController**: list/tag selection, context menus, CRUD for lists.
- **TodoListController**: selection, multi‑edit, inline create/edit, batch ops, grouping.
- **DetailController**: field editing, validation hooks, subtask ordering, recurrence.
- **SearchController**: parses query string → filter AST → model query.
- **HelpController**: shows context‑aware keymap; search across commands.

### 5.3 Command Catalog (subset)
- `createTodo({title, listId, ...})`
- `updateTodo({id, patch})`
- `toggleDone({id})`
- `setDue({id, due})`
- `setPriority({id, level})`
- `addTag({id, tag})` / `removeTag({id, tag})`
- `moveToList({id, listId})`
- `archiveDone({listId?})`
- `snooze({id, until})`
- `bulkApply({ids, patch})`

Each command returns an **inverse** for Undo; multi‑commands compose into a single entry.

---

## 6) Configuration

### 6.1 Config Files
- `~/.todo-tui/config.json`
  - theme: `"dark" | "light" | "high-contrast"`
  - keymap overrides
  - startup view (saved filter/list)
  - editor options (wrap, markdown preview)

### 6.2 Keymap Overrides
- User‑definable JSON mapping physical keys → command IDs (with context scopes).

---

## 7) Build, Run, and Distribution

### 7.1 Scripts
- `dev`: ts-node with hot‑reload for controllers/model; reload view on save.
- `build`: tsc to `dist/` + copy assets.
- `start`: run compiled app.
- `test`: jest/vitest suite.

### 7.2 Packaging
- Distribute as `npm` package with bin entry `todo-tui`.
- Optionally bundle with `pkg` or `nexe` for single binary per OS.

---

## 8) Open Questions (to confirm with product/you)
1. **Recurrence semantics**: regenerate on completion or on due‑date arrival if missed?
2. **Default storage**: JSON only for v1, or ship SQLite option at launch?
3. **Sync**: out of scope for v1, or minimal git‑based sync?
4. **Search**: strict filters only or fuzzy search by default?
5. **Markdown**: in‑app preview needed for descriptions, or plain text for v1?
6. **Priority scale**: 0..3 OK, or use 1..5?
7. **Theming**: ship high‑contrast at launch?
8. **Import/Export**: which formats are must‑have for v1 (CSV, todo.txt, JSON)?
9. **Shortcuts**: Windows‑friendly alternates for `Ctrl+P`, etc. acceptable?
10. **Telemetry**: include any anonymous perf metrics, or skip entirely for v1?

---

## 9) Milestones
- **M0 — Skeleton (Week 1)**: project scaffolding, core types, blessed root, 3‑panel layout.
- **M1 — CRUD (Week 2)**: create/edit/delete, persistence JSON, key bindings, validation.
- **M2 — Power‑User (Week 3)**: search/filter, batch ops, grouping, undo/redo.
- **M3 — Polish (Week 4)**: theming, help panel, backups, tests, packaging.
- **M4 — Stretch**: SQLite, import/export, recurrence, plugin API.

---

## 10) Appendix

### 10.1 Example Config (keymap excerpt)
```json
{
  "theme": "dark",
  "keymap": {
    "global": { "F1": "help.toggle", "Ctrl+P": "palette.open" },
    "todos": { "x": "todo.toggleDone", "e": "todo.edit", "d": "todo.setDue" }
  }
}
```

### 10.2 Example Storage Record (JSON)
```json
{
  "version": 1,
  "todos": {
    "5e9a": {
      "id": "5e9a",
      "title": "Write design doc",
      "status": "open",
      "createdAt": "2025-09-15T20:00:00.000Z",
      "updatedAt": "2025-09-15T20:00:00.000Z",
      "priority": 2,
      "tags": ["work"],
      "listId": "inbox"
    }
  },
  "lists": {
    "inbox": { "id": "inbox", "name": "Inbox", "order": 0 }
  },
  "order": ["5e9a"]
}
```

