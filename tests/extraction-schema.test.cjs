const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Compile the pure schema module at test time to use Node's built-in runner
// without adding a test framework dependency.
const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'extraction', 'schema.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputText)(require, loaded, loaded.exports);
const { ExtractionError, parseDraftJson, validateDraftSchema, isRecoverableExtractionFailure } = loaded.exports;

const validSchema = {
  title: 'Community Event Registration',
  description: 'Register to attend the event.',
  sections: [{ heading: 'Attendee', instruction: 'Your details' }],
  fields: [{
    label: 'Full name', fieldType: 'text', placeholder: 'Enter your full name',
    required: true, options: null, confidence: 0.98,
  }],
};

test('accepts valid structured JSON extraction', () => {
  assert.deepEqual(parseDraftJson(JSON.stringify(validSchema)), validSchema);
});

test('rejects malformed JSON without exposing parse details', () => {
  assert.throws(() => parseDraftJson("I'm unable to help with that request"), (error) => {
    assert.ok(error instanceof ExtractionError);
    assert.equal(error.code, 'INVALID_SCHEMA');
    assert.doesNotMatch(error.message, /unable|JSON\.parse|Unexpected token/i);
    return true;
  });
});

test('refusal is safe and is never a recoverable retry', () => {
  const refusal = new ExtractionError('REFUSED');
  assert.equal(refusal.code, 'REFUSED');
  assert.equal(isRecoverableExtractionFailure(refusal), false);
});

test('rejects missing field properties without exposing document labels', () => {
  assert.throws(() => validateDraftSchema({ ...validSchema, fields: [{ label: 'Email' }] }), (error) => {
    assert.ok(error instanceof ExtractionError);
    assert.equal(error.code, 'INVALID_SCHEMA');
    assert.doesNotMatch(error.message, /Email|fieldType|confidence/);
    return true;
  });
});

test('rejects a form schema with no fields', () => {
  assert.throws(() => validateDraftSchema({ ...validSchema, fields: [] }), (error) => {
    assert.ok(error instanceof ExtractionError);
    assert.equal(error.code, 'INVALID_SCHEMA');
    return true;
  });
});
