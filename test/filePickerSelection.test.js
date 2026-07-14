const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('buildPickerSelectionState supports ctrl/cmd toggles and shift range selection', () => {
  const runtimeCorePath = path.join(__dirname, '..', 'src', 'server', 'USER', 'root', 'systemfiles', 'runtime', 'core', 'runtimeCore.js');
  const source = fs.readFileSync(runtimeCorePath, 'utf8');
  const match = source.match(/function buildPickerSelectionState\([\s\S]*?return singleSelection;\s*\n\s*\}/);
  assert.ok(match, 'expected buildPickerSelectionState helper to exist in runtimeCore.js');

  const context = {
    console,
    Set,
    Array,
    Math,
    Object,
    String,
    Number,
    Boolean,
    Date,
  };
  context.window = context;
  context.global = context;
  vm.runInNewContext(`(${match[0]})`, context);
  const buildPickerSelectionState = context.buildPickerSelectionState;

  const entries = [
    { path: '/a', name: 'a' },
    { path: '/b', name: 'b' },
    { path: '/c', name: 'c' },
    { path: '/d', name: 'd' },
  ];

  let selection = new Set(['/a']);
  selection = new Set(buildPickerSelectionState({
    selected: selection,
    clickedPath: '/c',
    clickedIndex: 2,
    anchorIndex: 0,
    allEntries: entries,
    event: { shiftKey: true },
  }));
  assert.deepEqual([...selection].sort(), ['/a', '/b', '/c']);

  selection = new Set(buildPickerSelectionState({
    selected: selection,
    clickedPath: '/b',
    clickedIndex: 1,
    anchorIndex: 2,
    allEntries: entries,
    event: { ctrlKey: true },
  }));
  assert.deepEqual([...selection].sort(), ['/a', '/c', '/b']);

  selection = new Set(buildPickerSelectionState({
    selected: selection,
    clickedPath: '/d',
    clickedIndex: 3,
    anchorIndex: 1,
    allEntries: entries,
    event: { metaKey: true },
  }));
  assert.deepEqual([...selection].sort(), ['/a', '/c', '/b', '/d']);

  selection = new Set(buildPickerSelectionState({
    selected: selection,
    clickedPath: '/d',
    clickedIndex: 3,
    anchorIndex: 1,
    allEntries: entries,
    event: {},
  }));
  assert.deepEqual([...selection], ['/d']);

  selection = new Set(buildPickerSelectionState({
    selected: new Set(['/a']),
    clickedPath: '/c',
    clickedIndex: 2,
    anchorIndex: 0,
    allEntries: entries,
    event: { ctrlKey: true },
    allowMultiple: false,
  }));
  assert.deepEqual([...selection], ['/c']);
});
