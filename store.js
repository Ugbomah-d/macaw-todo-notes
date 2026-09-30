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
