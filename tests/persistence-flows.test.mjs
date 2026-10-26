import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const files = {
  stateTs: await readFile(new URL('../src/state.ts', import.meta.url), 'utf8'),
  stateJs: await readFile(new URL('../src/state.js', import.meta.url), 'utf8'),
  notesTs: await readFile(new URL('../src/screens/notes.ts', import.meta.url), 'utf8'),
  notesJs: await readFile(new URL('../src/screens/notes.js', import.meta.url), 'utf8'),
  alertsTs: await readFile(new URL('../src/alertService.ts', import.meta.url), 'utf8'),
  alertsJs: await readFile(new URL('../src/alertService.js', import.meta.url), 'utf8'),
  dbTs: await readFile(new URL('../src/db.ts', import.meta.url), 'utf8'),
  dbJs: await readFile(new URL('../src/db.js', import.meta.url), 'utf8'),
};

test('notes change in memory only after encrypted storage succeeds', () => {
  for (const source of [files.stateTs, files.stateJs]) {
    const saveStart = source.indexOf('async saveNote(');
    const deleteStart = source.indexOf('async deleteNote(');
    const setNotesAfterSave = source.indexOf('this.state = { ...this.state, notes, editingNoteId: null }', saveStart);
    const persistOnSave = source.indexOf('await this._saveNotes(notes)', saveStart);
    const setNotesAfterDelete = source.indexOf('this.state = { ...this.state, notes }', deleteStart);
    const persistOnDelete = source.indexOf('await this._saveNotes(notes)', deleteStart);

    assert.ok(saveStart >= 0 && persistOnSave > saveStart && setNotesAfterSave > persistOnSave);
    assert.ok(deleteStart >= 0 && persistOnDelete > deleteStart && setNotesAfterDelete > persistOnDelete);
  }
  for (const source of [files.notesTs, files.notesJs]) {
    assert.match(source, /await store\.saveNote\(/);
    assert.match(source, /Could not save this note/);
    assert.match(source, /await store\.deleteNote\(/);
    assert.match(source, /Could not delete this note/);
  }
});

test('alert history distinguishes opened message apps from failures and reports log errors', () => {
  for (const source of [files.alertsTs, files.alertsJs]) {
    assert.match(source, /const returnPromise = waitForReturn\(\)/);
    assert.match(source, /const appOpened = await returnPromise/);
    assert.match(source, /appOpened \? 'opened' : 'failed'/);
    assert.match(source, /const recorded = await logAlert/);
    assert.match(source, /store\.setAlertLogWarning\(!recorded\)/);
    assert.match(source, /document\.visibilityState === 'hidden'/);
    assert.match(source, /finish\(false\)/);
  }
  for (const source of [files.dbTs, files.dbJs]) {
    assert.match(source, /export async function insertAlertLog/);
    assert.match(source, /if \(!DB_CONFIGURED\)\s*return false/);
    assert.match(source, /return true/);
    assert.match(source, /return false/);
  }
});
