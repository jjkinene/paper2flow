const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(compiled.outputText, filename);
};
const Module = require('node:module');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === '@/lib/response-data') {
    request = path.join(__dirname, '..', 'lib', 'response-data.ts');
  }
  return resolveFilename.call(this, request, parent, isMain, options);
};

const { buildSubmissionPayload, normalizeResponsePayload, getResponseAnswer, formatResponseAnswer } =
  require('../lib/response-data.ts');
const { buildResponseSchema } = require('../lib/validation.ts');
const { formatCsv } = require('../lib/csv.ts');

const fields = [
  { id: '11111111-1111-4111-8111-111111111111', formId: 'form', position: 0, label: 'Full name', fieldType: 'text', placeholder: '', required: true, options: null, confidence: null, confirmed: true },
  { id: '22222222-2222-4222-8222-222222222222', formId: 'form', position: 1, label: 'Email', fieldType: 'text', placeholder: '', required: false, options: null, confidence: null, confirmed: true },
  { id: '33333333-3333-4333-8333-333333333333', formId: 'form', position: 2, label: 'Topics', fieldType: 'checkbox', placeholder: '', required: true, options: [{ label: 'Safety', value: 'safety' }, { label: 'Health', value: 'health' }], confidence: null, confirmed: true },
  { id: '44444444-4444-4444-8444-444444444444', formId: 'form', position: 3, label: 'Age', fieldType: 'number', placeholder: '', required: false, options: null, confidence: null, confirmed: true },
];

function formData(values) {
  return { getAll: (key) => values[key] ?? [] };
}

test('builds an ID-keyed payload from required, optional, checkbox, and numeric controls', () => {
  const payload = buildSubmissionPayload(formData({
    [fields[0].id]: ['Avery Sample'],
    [fields[1].id]: ['avery@example.test'],
    [fields[2].id]: ['safety', 'health'],
    [fields[3].id]: ['27'],
  }), fields);

  assert.deepEqual(payload, {
    [fields[0].id]: 'Avery Sample',
    [fields[1].id]: 'avery@example.test',
    [fields[2].id]: ['safety', 'health'],
    [fields[3].id]: 27,
  });
  assert.deepEqual(buildResponseSchema(fields).parse(payload), payload);
});

test('optional empty fields are retained while required fields still validate', () => {
  const payload = buildSubmissionPayload(formData({
    [fields[0].id]: ['Avery Sample'],
    [fields[2].id]: ['safety'],
  }), fields);
  assert.equal(payload[fields[1].id], '');
  assert.deepEqual(payload[fields[2].id], ['safety']);
  assert.equal(payload[fields[3].id], '');
  assert.deepEqual(buildResponseSchema(fields).parse(payload), payload);

  const missingRequired = { ...payload, [fields[0].id]: '' };
  assert.equal(buildResponseSchema(fields).safeParse(missingRequired).success, false);
});

test('stored JSONB payload, dashboard projection, and CSV use the same UUID keys and answers', () => {
  const submitted = buildSubmissionPayload(formData({
    [fields[0].id]: ['Avery Sample'],
    [fields[1].id]: ['avery@example.test'],
    [fields[2].id]: ['safety'],
    [fields[3].id]: ['27'],
  }), fields);
  const validated = buildResponseSchema(fields).parse(submitted);
  const storedJsonbPayload = normalizeResponsePayload(validated, fields);

  const dashboardAnswers = fields.map((field) =>
    formatResponseAnswer(getResponseAnswer(storedJsonbPayload, field)));
  assert.deepEqual(dashboardAnswers, ['Avery Sample', 'avery@example.test', 'safety', '27']);

  const csv = formatCsv(fields, [{
    id: 'response', formId: 'form', submittedAt: '2026-11-18T09:00:00.000Z', payload: storedJsonbPayload,
  }]);
  const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
  assert.equal(lines[0], '"Submitted At","Full name","Email","Topics","Age"');
  assert.equal(lines[1], '"2026-11-18","Avery Sample","avery@example.test","safety","27"');
});
