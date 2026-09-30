# To-do + Notes App — Design

**Team:** Macaw
**Date:** 2026-09-30

## Goal
A simple, public to-do list with a notes section. Reviewers must be able to open the
deployed link (no login, no deployment protection) and see the full app immediately,
including a one-click "Load sample data" button and a way back to the empty state.

## Constraints
- No authentication, no backend. Static site deployed on Vercel.
- Plain HTML/CSS/JS (ES modules), no build step, no runtime dependencies.
- Data persists in `localStorage` under a single key (`macaw-todo-notes-v1`).
- Works at phone width (16px gutter, no horizontal scroll).

## Files
| File | Purpose |
|------|---------|
| `index.html` | Page shell: header (app name + "Team Macaw"), toolbar, To-dos section, Notes section |
| `styles.css` | Styling, responsive layout, light/dark via `prefers-color-scheme` |
| `store.js` | Pure state logic, no DOM access (exported functions, see below) |
| `app.js` | DOM wiring: reads user input, calls store functions, saves, re-renders |
| `tests/store.test.js` | Unit tests for `store.js` using `node --test` |
| `package.json` | Only `"type": "module"` and a `test` script, no dependencies |
| `agents.md` | Project overview, structure, conventions, run/test/deploy steps for AI agents |
| `README.md` | Short description, how to run locally, live link |

## State shape
```js
{
  todos: [{ id, text, done, createdAt }],
  notes: [{ id, title, body, updatedAt }]
}
```

## store.js API (all pure; each returns a new state)
- `emptyState()`
- `addTodo(state, text)`: trims the text; empty or whitespace-only text leaves state unchanged
- `toggleTodo(state, id)`, `editTodo(state, id, text)` (empty text deletes the todo), `deleteTodo(state, id)`
- `clearCompleted(state)`, `remainingCount(state)`
- `addNote(state, title, body)`: ignored if both are empty; a missing title becomes "Untitled"
- `editNote(state, id, title, body)`: updates `updatedAt`
- `deleteNote(state, id)`
- `sampleState()`: 6 todos (some done) and 3 notes
- `loadState(storage)` / `saveState(storage, state)`: never throw; invalid or missing data returns `emptyState()`

## UI behaviour
- **To-dos:** input + Add button (Enter submits). Checkbox toggles done. Double-click the text
  (or use the Edit button) to edit inline; Enter saves, Escape cancels. Delete button.
  Footer shows "N items left" and a "Clear completed" button.
- **Notes:** title + body form with an Add note button. Each note card has Edit and Delete buttons
  and shows its last-updated time.
- **Toolbar:** "Load sample data" and "Reset to empty". Both ask `confirm()` only when there is
  existing data that would be replaced.
- **Empty states:** a message in each section that points to the sample data button.
- All user text is rendered with `textContent` (no innerHTML injection).

## Error handling
- Wrap `localStorage` access in try/catch; if it fails, the app keeps working in memory.
- Corrupt JSON or the wrong shape → start empty.

## Testing
- TDD on `store.js` with `node --test` (no dependencies).
- Manual browser check: add, toggle, edit, delete, clear completed, notes CRUD, sample data,
  reset, reload persistence, and phone width.

## Deployment
- Vercel static deploy of the project root.
- Turn off Deployment Protection in Project Settings, then verify the link in an incognito window.
- Add the team name "Macaw" to the submission form (manual step for the user).

## Out of scope
Accounts, sync, filtering or search, due dates, tags, drag-and-drop reordering.
