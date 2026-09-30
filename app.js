// DOM layer: reads input, calls pure store functions, saves, re-renders.
import * as store from './store.js';

const storage = (() => {
  try { return window.localStorage; } catch { return null; }
})();

let state = store.loadState(storage);
let editingTodoId = null;
let editingNoteId = null;

const $ = (id) => document.getElementById(id);
const els = {
  loadSample: $('load-sample'), reset: $('reset'), warning: $('storage-warning'),
  todoForm: $('todo-form'), todoInput: $('todo-input'), todoEmpty: $('todo-empty'),
  todoList: $('todo-list'), todoFooter: $('todo-footer'), todoCount: $('todo-count'),
  clearCompleted: $('clear-completed'),
  noteForm: $('note-form'), noteTitle: $('note-title'), noteBody: $('note-body'),
  noteCancel: $('note-cancel'), noteSubmit: $('note-submit'),
  noteEmpty: $('note-empty'), noteList: $('note-list'),
};

function save(next) {
  state = next;
  els.warning.hidden = store.saveState(storage, state);
}

function commit(next) {
  save(next);
  render();
}

const hasData = () => state.todos.length > 0 || state.notes.length > 0;

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function button(label, onClick, className = 'icon-btn', ariaLabel) {
  const b = el('button', { type: 'button', className, textContent: label });
  if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
  b.addEventListener('click', onClick);
  return b;
}

/* ---------- To-dos ---------- */

function startEditTodo(id) {
  editingTodoId = id;
  render();
}

// Finishing an edit swaps only this row, so a click that caused the blur
// still lands on its (untouched) target button.
function todoEditor(todo, li) {
  const input = el('input', { type: 'text', className: 'todo-edit', value: todo.text, maxLength: 200 });
  input.setAttribute('aria-label', 'Edit task');
  let finished = false;
  const finish = (keep) => {
    if (finished) return;
    finished = true;
    editingTodoId = null;
    if (!li.isConnected) return;
    if (keep) save(store.editTodo(state, todo.id, input.value));
    const updated = state.todos.find(t => t.id === todo.id);
    if (updated) li.replaceWith(todoItem(updated));
    else li.remove();
    renderSummary();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
  queueMicrotask(() => { input.focus(); input.select(); });
  return input;
}

function todoItem(todo) {
  const li = el('li', { className: todo.done ? 'todo done' : 'todo' });
  if (todo.id === editingTodoId) {
    li.append(todoEditor(todo, li));
    return li;
  }
  const checkbox = el('input', { type: 'checkbox', checked: todo.done });
  checkbox.setAttribute('aria-label', `Done: ${todo.text}`);
  checkbox.addEventListener('change', () => commit(store.toggleTodo(state, todo.id)));

  const text = el('span', { className: 'todo-text', textContent: todo.text, title: 'Double-click to edit' });
  text.addEventListener('dblclick', () => startEditTodo(todo.id));

  li.append(checkbox, text, el('div', { className: 'actions' }, [
    button('Edit', () => startEditTodo(todo.id), 'icon-btn', `Edit: ${todo.text}`),
    button('Delete', () => commit(store.deleteTodo(state, todo.id)), 'icon-btn danger', `Delete: ${todo.text}`),
  ]));
  return li;
}

function renderTodos() {
  els.todoList.replaceChildren(...state.todos.map(todoItem));
  renderSummary();
}

function renderSummary() {
  const count = state.todos.length;
  els.todoEmpty.hidden = count > 0;
  els.todoFooter.hidden = count === 0;
  const left = store.remainingCount(state);
  els.todoCount.textContent = `${left} ${left === 1 ? 'item' : 'items'} left`;
  els.clearCompleted.disabled = left === count;
  els.reset.disabled = !hasData();
}

/* ---------- Notes ---------- */

function resetNoteForm() {
  editingNoteId = null;
  els.noteForm.reset();
  els.noteSubmit.textContent = 'Add note';
  els.noteCancel.hidden = true;
}

function startEditNote(note) {
  editingNoteId = note.id;
  els.noteTitle.value = note.title;
  els.noteBody.value = note.body;
  els.noteSubmit.textContent = 'Save note';
  els.noteCancel.hidden = false;
  render();
  els.noteForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  els.noteTitle.focus();
}

const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function noteItem(note) {
  const time = el('time', { dateTime: new Date(note.updatedAt).toISOString(), textContent: `Updated ${timeFormat.format(note.updatedAt)}` });
  const children = [el('h3', { textContent: note.title })];
  if (note.body) children.push(el('p', { className: 'note-body', textContent: note.body }));
  children.push(el('div', { className: 'note-meta' }, [
    time,
    el('div', { className: 'actions' }, [
      button('Edit', () => startEditNote(note), 'icon-btn', `Edit note: ${note.title}`),
      button('Delete', () => {
        if (note.id === editingNoteId) resetNoteForm();
        commit(store.deleteNote(state, note.id));
      }, 'icon-btn danger', `Delete note: ${note.title}`),
    ]),
  ]));
  return el('li', { className: note.id === editingNoteId ? 'note editing' : 'note' }, children);
}

function renderNotes() {
  els.noteList.replaceChildren(...state.notes.map(noteItem));
  els.noteEmpty.hidden = state.notes.length > 0;
}

/* ---------- Page ---------- */

function render() {
  renderTodos();
  renderNotes();
}

els.todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  commit(store.addTodo(state, els.todoInput.value));
  els.todoInput.value = '';
  els.todoInput.focus();
});

els.clearCompleted.addEventListener('click', () => commit(store.clearCompleted(state)));

els.noteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = els.noteTitle.value;
  const body = els.noteBody.value;
  const next = editingNoteId
    ? store.editNote(state, editingNoteId, title, body)
    : store.addNote(state, title, body);
  if (next === state) { els.noteTitle.focus(); return; } // nothing to save
  resetNoteForm();
  commit(next);
});

els.noteCancel.addEventListener('click', () => { resetNoteForm(); render(); });

els.loadSample.addEventListener('click', () => {
  if (hasData() && !confirm('Replace your current to-dos and notes with sample data?')) return;
  editingTodoId = null;
  resetNoteForm();
  commit(store.sampleState());
});

els.reset.addEventListener('click', () => {
  if (hasData() && !confirm('Delete all to-dos and notes? This cannot be undone.')) return;
  editingTodoId = null;
  resetNoteForm();
  commit(store.emptyState());
});

render();
