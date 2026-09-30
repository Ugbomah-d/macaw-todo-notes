# To-do + Notes App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, login-free to-do list with a notes section, one-click sample data, and a reset to the empty state, deployable as a static site on Vercel.

**Architecture:** `store.js` holds all state logic as pure functions (state in, new state out) and is unit-tested with Node's built-in test runner. `app.js` is a thin DOM layer: it reads input, calls store functions, saves to `localStorage`, and re-renders. There is no build step and there are no runtime dependencies.

**Tech Stack:** HTML, CSS, vanilla JS (ES modules), `node --test` (Node 22), Vercel static hosting.

**Spec:** `docs/superpowers/specs/2026-09-30-todo-notes-design.md`

## Global Constraints

- No authentication, no backend, no runtime dependencies, no build step.
- Storage key: `macaw-todo-notes-v1`.
- Header shows "Team Macaw".
- User text is rendered with `textContent` or `value`, never `innerHTML`.
- Layout works at phone width: 16px side gutter, no horizontal scroll.
- Light and dark themes via `prefers-color-scheme`.
- Commits have no Claude co-author trailer (user's global instruction).

## Review Focus

1. **Whitespace-only input:** adding "   " as a to-do or note must be ignored (Task 1 and Task 2 tests).
2. **Corrupt or partially valid storage:** bad JSON, the wrong shape, or items missing fields must load as empty or drop only the bad items, never crash (Task 3 tests).
3. **Storage unavailable or full:** `getItem` or `setItem` throwing, or `storage` being `null`, must not crash; the app shows a warning and keeps working in memory (Task 3 tests + Task 4 manual check).
4. **HTML in user text:** `<img src=x onerror=alert(1)>` must display as literal text (Task 4 manual check).
5. **Very long words or text:** must wrap without horizontal scroll at 375px width (Task 4 manual check, CSS `overflow-wrap: anywhere`).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` | `"type": "module"` + `npm test` script |
| `store.js` | Pure state functions + storage load/save |
| `tests/store.test.js` | Unit tests for `store.js` |
| `index.html` | Page markup |
| `styles.css` | Styling, theming, responsive layout |
| `app.js` | DOM rendering and event wiring |
| `agents.md` | Guide for AI agents working on the repo |
| `README.md` | Human-facing overview and live link |

---

### Task 1: To-do logic in store.js

**Files:**
- Create: `package.json`, `store.js`, `tests/store.test.js`

**Interfaces:**
- Produces: `STORAGE_KEY`, `emptyState(): {todos: [], notes: []}`, `addTodo(state, text, now?)`, `toggleTodo(state, id)`, `editTodo(state, id, text)`, `deleteTodo(state, id)`, `clearCompleted(state)`, `remainingCount(state): number`. Todo = `{id: string, text: string, done: boolean, createdAt: number}`.

- [ ] **Step 1: Create package.json**

```json
{
  "name": "macaw-todo-notes",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

- [ ] **Step 2: Write failing to-do tests** in `tests/store.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as s from '../store.js';

test('emptyState has no todos or notes', () => {
  assert.deepEqual(s.emptyState(), { todos: [], notes: [] });
});

test('addTodo trims text and appends an undone todo', () => {
  const st = s.addTodo(s.emptyState(), '  Buy milk  ', 1000);
  assert.equal(st.todos.length, 1);
  assert.equal(st.todos[0].text, 'Buy milk');
  assert.equal(st.todos[0].done, false);
  assert.equal(st.todos[0].createdAt, 1000);
  assert.equal(typeof st.todos[0].id, 'string');
});

test('addTodo ignores empty and whitespace-only text', () => {
  const st = s.emptyState();
  assert.equal(s.addTodo(st, ''), st);
  assert.equal(s.addTodo(st, '   \n\t'), st);
  assert.equal(s.addTodo(st, undefined), st);
});

test('addTodo does not mutate the input state', () => {
  const st = s.emptyState();
  s.addTodo(st, 'x');
  assert.equal(st.todos.length, 0);
});

test('todo ids are unique', () => {
  let st = s.emptyState();
  for (let i = 0; i < 50; i++) st = s.addTodo(st, `t${i}`, 1);
  assert.equal(new Set(st.todos.map(t => t.id)).size, 50);
});

test('toggleTodo flips done for the matching id only', () => {
  let st = s.addTodo(s.addTodo(s.emptyState(), 'a'), 'b');
  const id = st.todos[0].id;
  st = s.toggleTodo(st, id);
  assert.equal(st.todos[0].done, true);
  assert.equal(st.todos[1].done, false);
  st = s.toggleTodo(st, id);
  assert.equal(st.todos[0].done, false);
});

test('toggleTodo with unknown id changes nothing', () => {
  const st = s.addTodo(s.emptyState(), 'a');
  assert.deepEqual(s.toggleTodo(st, 'nope'), st);
});

test('editTodo updates trimmed text; empty text deletes', () => {
  let st = s.addTodo(s.emptyState(), 'a');
  const id = st.todos[0].id;
  st = s.editTodo(st, id, '  b ');
  assert.equal(st.todos[0].text, 'b');
  st = s.editTodo(st, id, '   ');
  assert.equal(st.todos.length, 0);
});

test('deleteTodo removes the matching todo', () => {
  let st = s.addTodo(s.addTodo(s.emptyState(), 'a'), 'b');
  st = s.deleteTodo(st, st.todos[0].id);
  assert.deepEqual(st.todos.map(t => t.text), ['b']);
});

test('clearCompleted and remainingCount', () => {
  let st = s.addTodo(s.addTodo(s.addTodo(s.emptyState(), 'a'), 'b'), 'c');
  st = s.toggleTodo(st, st.todos[1].id);
  assert.equal(s.remainingCount(st), 2);
  st = s.clearCompleted(st);
  assert.deepEqual(st.todos.map(t => t.text), ['a', 'c']);
  assert.equal(s.remainingCount(st), 2);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL (cannot find module `../store.js`)

- [ ] **Step 4: Implement the to-do part of `store.js`**

```js
// Pure state logic for the to-do + notes app. No DOM access here.

export const STORAGE_KEY = 'macaw-todo-notes-v1';

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const clean = (value) => String(value ?? '').trim();

export function emptyState() {
  return { todos: [], notes: [] };
}

export function addTodo(state, text, now = Date.now()) {
  const value = clean(text);
  if (!value) return state;
  const todo = { id: makeId(), text: value, done: false, createdAt: now };
  return { ...state, todos: [...state.todos, todo] };
}

export function toggleTodo(state, id) {
  return { ...state, todos: state.todos.map(t => (t.id === id ? { ...t, done: !t.done } : t)) };
}

export function editTodo(state, id, text) {
  const value = clean(text);
  if (!value) return deleteTodo(state, id);
  return { ...state, todos: state.todos.map(t => (t.id === id ? { ...t, text: value } : t)) };
}

export function deleteTodo(state, id) {
  return { ...state, todos: state.todos.filter(t => t.id !== id) };
}

export function clearCompleted(state) {
  return { ...state, todos: state.todos.filter(t => !t.done) };
}

export function remainingCount(state) {
  return state.todos.filter(t => !t.done).length;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add package.json store.js tests/store.test.js
git commit -m "feat: add to-do state logic with tests"
```

---

### Task 2: Notes and sample data in store.js

**Files:**
- Modify: `store.js` (append), `tests/store.test.js` (append)

**Interfaces:**
- Consumes: `emptyState`, `makeId`, `clean` from Task 1.
- Produces: `addNote(state, title, body, now?)`, `editNote(state, id, title, body, now?)`, `deleteNote(state, id)`, `sampleState(now?)`. Note = `{id, title, body, updatedAt: number}`. New notes go first (newest first).

- [ ] **Step 1: Append failing tests**

```js
test('addNote prepends a note; missing title becomes Untitled', () => {
  let st = s.addNote(s.emptyState(), ' First ', ' body ', 5);
  st = s.addNote(st, '', 'only body', 6);
  assert.equal(st.notes.length, 2);
  assert.equal(st.notes[0].title, 'Untitled');
  assert.equal(st.notes[0].body, 'only body');
  assert.equal(st.notes[1].title, 'First');
  assert.equal(st.notes[1].body, 'body');
  assert.equal(st.notes[1].updatedAt, 5);
});

test('addNote ignores a note with empty title and body', () => {
  const st = s.emptyState();
  assert.equal(s.addNote(st, '  ', '\n '), st);
});

test('editNote updates fields and updatedAt', () => {
  let st = s.addNote(s.emptyState(), 'a', 'b', 1);
  const id = st.notes[0].id;
  st = s.editNote(st, id, 'A', 'B', 9);
  assert.deepEqual({ ...st.notes[0], id: 'x' }, { id: 'x', title: 'A', body: 'B', updatedAt: 9 });
});

test('editNote with both fields empty leaves state unchanged', () => {
  const st = s.addNote(s.emptyState(), 'a', 'b', 1);
  assert.equal(s.editNote(st, st.notes[0].id, ' ', ''), st);
});

test('deleteNote removes the matching note', () => {
  let st = s.addNote(s.addNote(s.emptyState(), 'a', ''), 'b', '');
  st = s.deleteNote(st, st.notes[0].id);
  assert.deepEqual(st.notes.map(n => n.title), ['a']);
});

test('sampleState has 6 todos (some done) and 3 notes with unique ids', () => {
  const st = s.sampleState(1000);
  assert.equal(st.todos.length, 6);
  assert.equal(st.notes.length, 3);
  assert.ok(st.todos.some(t => t.done));
  assert.ok(st.todos.some(t => !t.done));
  const ids = [...st.todos, ...st.notes].map(x => x.id);
  assert.equal(new Set(ids).size, ids.length);
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npm test`
Expected: FAIL (`s.addNote is not a function`)

- [ ] **Step 3: Append the implementation to `store.js`**

```js
export function addNote(state, title, body, now = Date.now()) {
  const t = clean(title);
  const b = clean(body);
  if (!t && !b) return state;
  const note = { id: makeId(), title: t || 'Untitled', body: b, updatedAt: now };
  return { ...state, notes: [note, ...state.notes] };
}

export function editNote(state, id, title, body, now = Date.now()) {
  const t = clean(title);
  const b = clean(body);
  if (!t && !b) return state;
  return {
    ...state,
    notes: state.notes.map(n => (n.id === id ? { ...n, title: t || 'Untitled', body: b, updatedAt: now } : n)),
  };
}

export function deleteNote(state, id) {
  return { ...state, notes: state.notes.filter(n => n.id !== id) };
}

const SAMPLE_TODOS = [
  ['Draft the project README', true],
  ['Turn off Vercel Deployment Protection', true],
  ['Add team name to the submission', false],
  ['Test the app in an incognito window', false],
  ['Upload agents.md', false],
  ['Celebrate with the team 🎉', false],
];

const SAMPLE_NOTES = [
  ['Standup — Monday', 'Everyone is on track.\nBlocker: waiting on design review for the notes layout.'],
  ['Ideas for v2', '• Due dates\n• Tags and filters\n• Sync across devices'],
  ['Demo script', '1. Open the app\n2. Click "Load sample data"\n3. Tick off a task\n4. Edit a note\n5. Reset to empty'],
];

export function sampleState(now = Date.now()) {
  const hour = 60 * 60 * 1000;
  return {
    todos: SAMPLE_TODOS.map(([text, done], i) => ({ id: makeId(), text, done, createdAt: now - (6 - i) * hour })),
    notes: SAMPLE_NOTES.map(([title, body], i) => ({ id: makeId(), title, body, updatedAt: now - i * 26 * hour })),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add store.js tests/store.test.js
git commit -m "feat: add notes and sample data logic"
```

---

### Task 3: Safe load/save

**Files:**
- Modify: `store.js` (append), `tests/store.test.js` (append)

**Interfaces:**
- Consumes: `STORAGE_KEY`, `emptyState`.
- Produces: `loadState(storage): State` (never throws), `saveState(storage, state): boolean` (true on success, never throws). `storage` is anything with `getItem`/`setItem`, or `null`.

- [ ] **Step 1: Append failing tests**

```js
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

test('saveState then loadState round-trips', () => {
  const store = fakeStorage();
  const st = s.addNote(s.addTodo(s.emptyState(), 'a'), 't', 'b');
  assert.equal(s.saveState(store, st), true);
  assert.deepEqual(s.loadState(store), st);
});

test('loadState returns empty for missing, corrupt, or wrong-shape data', () => {
  assert.deepEqual(s.loadState(fakeStorage()), s.emptyState());
  assert.deepEqual(s.loadState(fakeStorage({ [s.STORAGE_KEY]: '{not json' })), s.emptyState());
  assert.deepEqual(s.loadState(fakeStorage({ [s.STORAGE_KEY]: '42' })), s.emptyState());
  assert.deepEqual(s.loadState(fakeStorage({ [s.STORAGE_KEY]: 'null' })), s.emptyState());
  assert.deepEqual(s.loadState(fakeStorage({ [s.STORAGE_KEY]: '{"todos":"x"}' })), s.emptyState());
});

test('loadState drops invalid items but keeps valid ones', () => {
  const raw = JSON.stringify({
    todos: [{ id: 'a', text: 'ok', done: false, createdAt: 1 }, { id: 'b' }, null],
    notes: [{ id: 'n', title: 't', body: 'b', updatedAt: 1 }, { title: 5 }],
  });
  const st = s.loadState(fakeStorage({ [s.STORAGE_KEY]: raw }));
  assert.deepEqual(st.todos.map(t => t.id), ['a']);
  assert.deepEqual(st.notes.map(n => n.id), ['n']);
});

test('loadState and saveState never throw when storage fails or is null', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.deepEqual(s.loadState(broken), s.emptyState());
  assert.deepEqual(s.loadState(null), s.emptyState());
  assert.equal(s.saveState(broken, s.emptyState()), false);
  assert.equal(s.saveState(null, s.emptyState()), false);
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npm test`
Expected: FAIL (`s.saveState is not a function`)

- [ ] **Step 3: Append the implementation to `store.js`**

```js
const isTodo = t => t && typeof t.id === 'string' && typeof t.text === 'string'
  && typeof t.done === 'boolean' && typeof t.createdAt === 'number';
const isNote = n => n && typeof n.id === 'string' && typeof n.title === 'string'
  && typeof n.body === 'string' && typeof n.updatedAt === 'number';

export function loadState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.todos) || !Array.isArray(data.notes)) return emptyState();
    return { todos: data.todos.filter(isTodo), notes: data.notes.filter(isNote) };
  } catch {
    return emptyState();
  }
}

export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add store.js tests/store.test.js
git commit -m "feat: add safe localStorage load/save"
```

---

### Task 4: UI (index.html, styles.css, app.js)

**Files:**
- Create: `index.html`, `styles.css`, `app.js`

**Interfaces:**
- Consumes: every export of `store.js` listed above.
- Produces: the working page. Element ids used by `app.js`: `load-sample`, `reset`, `storage-warning`, `todo-form`, `todo-input`, `todo-empty`, `todo-list`, `todo-footer`, `todo-count`, `clear-completed`, `note-form`, `note-title`, `note-body`, `note-cancel`, `note-submit`, `note-empty`, `note-list`.

- [ ] **Step 1: Create `index.html`**: header with the "To-do & Notes" title, the "Team Macaw" label and the toolbar (`load-sample`, `reset`); a hidden `storage-warning`; `main` with two `section.panel` elements (To-dos, Notes) containing the forms, empty messages, lists and to-do footer using the ids above; a site footer "Built by Team Macaw · Your data stays in this browser." Load `styles.css` and `<script type="module" src="app.js">`. Inputs have visually hidden labels. `maxlength`: to-do 200, note title 100, note body 2000.

- [ ] **Step 2: Create `styles.css`**: color tokens on `:root`, dark overrides under `@media (prefers-color-scheme: dark)`; body background set explicitly; `main` is a two-column grid at ≥800px and one column below; 16px side gutter; `.todo.done .todo-text` struck through; `overflow-wrap: anywhere` on to-do text, note title and note body; `white-space: pre-wrap` on note body; `.sr-only` utility; visible `:focus-visible` outlines; `[hidden] { display: none !important; }`.

- [ ] **Step 3: Create `app.js`**: import `* as store`; get storage with `try { window.localStorage } catch { null }`; `state = store.loadState(storage)`; `commit(next)` sets state, calls `saveState` and shows `#storage-warning` if it returns false, then `render()`. Render with `document.createElement` + `textContent` only. To-dos: the checkbox toggles; double-click the text or the Edit button to edit inline (Enter/blur saves, Escape cancels, a `finished` guard prevents double commits); Delete button; "N item(s) left"; Clear completed is disabled when nothing is done. Notes: a form that adds a note, or saves one when `editingNoteId` is set (the submit label switches to "Save note" and Cancel appears); cards show the title, body, "Updated <locale time>", Edit and Delete. Deleting the note being edited resets the form. Toolbar: Load sample data (`confirm` only if data exists) → `commit(store.sampleState())`; Reset to empty (disabled when there's no data, `confirm`) → `commit(store.emptyState())`; both cancel in-progress edits.

- [ ] **Step 4: Verify in the browser**: serve with `npx --yes serve -l 5173 .` (or `python -m http.server 5173`) and check: add/toggle/edit/Escape/delete a to-do; whitespace is ignored; Clear completed; notes add/edit/cancel/delete; Load sample data; Reset to empty; reload persists; the text `<img src=x onerror=alert(1)>` renders literally; a long unbroken word wraps; no horizontal scroll at 375px; no console errors.

- [ ] **Step 5: Run `npm test` again (still all PASS) and commit**

```bash
git add index.html styles.css app.js
git commit -m "feat: add to-do and notes UI with sample data controls"
```

---

### Task 5: Docs and deployment

**Files:**
- Create: `agents.md`, `README.md`, `.gitignore` (`node_modules/`, `.vercel/`)

- [ ] **Step 1: Write `agents.md`**: purpose, team, stack, file map, architecture rule (logic in `store.js`, pure + tested; DOM only in `app.js`), conventions (no innerHTML for user text, no dependencies, no auth), commands (`npm test`, local serve), deploy steps, and the "Load sample data" / reset behaviour.
- [ ] **Step 2: Write `README.md`**: one-paragraph description, features, run/test commands, a live link placeholder filled after deploy.
- [ ] **Step 3: Commit** `docs: add agents.md and README`.
- [ ] **Step 4: Deploy** (with the user's go-ahead): push to GitHub (`gh repo create`) and import into Vercel, or `npx vercel --prod` after `vercel login`. The user turns off Deployment Protection (Project → Settings → Deployment Protection → Vercel Authentication: Disabled), then opens the URL in an incognito window.
- [ ] **Step 5: Put the live URL in the README and commit.**
