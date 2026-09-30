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
