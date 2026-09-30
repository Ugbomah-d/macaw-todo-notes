# agents.md — Macaw To-do & Notes

Guide for AI coding agents (and humans) working on this repository.

## What this is
A simple, public to-do list with a notes section, built by **Team Macaw**.
Reviewers open the deployed link and use it right away: there is **no login and no backend**.
A **Load sample data** button fills the app with example content, and **Reset to empty** returns it to its empty state.

## Stack
- Plain HTML, CSS and JavaScript (ES modules). No framework, no build step, no runtime dependencies.
- Data is stored in the browser's `localStorage` under the key `macaw-todo-notes-v1`.
- Tests use Node's built-in test runner (`node --test`, Node 18+; developed on Node 22).
- Hosted as a static site on Vercel.

## Files
| File | Responsibility |
|------|----------------|
| `index.html` | Page markup: header (Team Macaw + toolbar), To-dos panel, Notes panel |
| `styles.css` | Styling; color tokens on `:root`, dark mode via `prefers-color-scheme`, responsive grid |
| `store.js` | **All state logic.** Pure functions: state in, new state out. No DOM access. |
| `app.js` | DOM layer: reads input, calls `store.js`, saves, re-renders |
| `tests/store.test.js` | Unit tests for `store.js` |
| `docs/superpowers/` | Design spec and implementation plan |

## State shape
```js
{
  todos: [{ id, text, done, createdAt }],   // createdAt: ms timestamp
  notes: [{ id, title, body, updatedAt }]    // newest note first
}
```

## Rules for changes
1. **Logic goes in `store.js`, and it gets a test first.** Write a failing test in `tests/store.test.js`, watch it fail, then implement. Store functions must stay pure and never mutate their input.
2. **`app.js` only wires the DOM.** It calls `commit(nextState)`, which saves and re-renders.
3. **Never use `innerHTML` for user text.** Build elements with `document.createElement` and set `textContent` or `value`.
4. **Storage must never crash the app.** `loadState` and `saveState` swallow errors. If saving fails, the page shows a warning and keeps working in memory.
5. **No authentication, no backend, no dependencies.** The app must stay publicly viewable with zero setup.
6. Keep the layout working at phone width (375px) with no horizontal scroll.

## Commands
```bash
npm test                          # run unit tests
python -m http.server 5173        # or: npx serve . — then open http://localhost:5173
```
ES modules don't load from `file://`, so always use a local server.

## Deploy
- Vercel: import the Git repo (framework preset "Other", no build command, output directory = root) or run `npx vercel --prod`.
- **Deployment Protection must be off:** Project → Settings → Deployment Protection → Vercel Authentication → Disabled.
- Verify by opening the production URL in an incognito window.
