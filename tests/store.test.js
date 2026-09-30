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
