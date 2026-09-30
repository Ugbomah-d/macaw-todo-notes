# To-do & Notes — Team Macaw

A simple to-do list with a notes section. No sign-up, no login: open it and start using it.

**Live app:** _link added after deploy_

## Features
- **To-dos:** add, tick off, edit (double-click or the Edit button), delete, clear completed, and an items-left counter
- **Notes:** add a note with a title and body, edit it, delete it; each note shows when it was last updated
- **Load sample data:** one click fills the app with example to-dos and notes
- **Reset to empty:** returns the app to its empty state
- Saves automatically in your browser (localStorage), works on phones, supports light and dark mode

## Run locally
```bash
python -m http.server 5173   # then open http://localhost:5173
npm test                     # unit tests (Node 18+)
```

See [`agents.md`](agents.md) for the project structure and conventions.
