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
