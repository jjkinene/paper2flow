const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  module._compile(compiled.outputText, filename);
};
const Module = require('node:module');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === '@/lib/response-data') request = path.join(__dirname, '..', 'lib', 'response-data.ts');
  return resolveFilename.call(this, request, parent, isMain, options);
};
const { formatResponsesPdf, formatResponsesDocx } = require('../lib/response-export.ts');

const fields = [
  { id: 'field-a', position: 0, label: 'Applicant name', fieldType: 'text' },
  { id: 'field-b', position: 1, label: 'Details', fieldType: 'textarea' },
];
const responses = [
  { id: 'r1', formId: 'f1', submittedAt: '2026-11-18T10:00:00.000Z', payload: { 'field-a': 'SAMPLE ANSWER ONE', 'field-b': 'Long response '.repeat(1500) } },
  { id: 'r2', formId: 'f1', submittedAt: '2026-11-18T11:00:00.000Z', payload: { 'field-a': 'SAMPLE ANSWER TWO', 'field-b': 'Second response answer' } },
];

function unzipTextEntries(buffer) {
  const files = {};
  let offset = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const compressedLength = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.toString('utf8', nameStart, nameStart + nameLength);
    const dataStart = nameStart + nameLength + extraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedLength);
    const raw = method === 8 ? zlib.inflateRawSync(compressed) : compressed;
    files[name] = raw.toString('utf8');
    offset = dataStart + compressedLength;
  }
  return files;
}

test('PDF export contains matching saved answers and paginates long, multiple responses', async () => {
  const { GlobalFonts } = require('@napi-rs/canvas');
  const pdf = formatResponsesPdf('Community Intake Form', fields, responses);
  assert.ok(GlobalFonts.has('Paper2FlowGeist'), 'the bundled PDF font should be registered');
  assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  const pageCount = [...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
  assert.ok(pageCount >= 2, `expected multiple PDF pages, received ${pageCount}`);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: true });
  try {
    const document = await loadingTask.promise;
    let text = '';
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    }
    for (const value of [
      'Paper2Flow', 'Community Intake Form', 'Response 1', 'Response 2',
      '18 November 2026 at 10:00 UTC', 'Applicant name', 'Details',
      'SAMPLE ANSWER ONE', 'Long response', 'SAMPLE ANSWER TWO',
      `Page 1 of ${document.numPages}`, `Page ${document.numPages} of ${document.numPages}`,
    ]) {
      assert.ok(text.includes(value), `missing PDF content: ${value}`);
    }
  } finally {
    await loadingTask.destroy();
  }
});

test('Word export is a DOCX package containing labels, answers, dates, and response breaks', () => {
  const docx = formatResponsesDocx('Community Intake Form', fields, responses);
  assert.equal(docx.readUInt32LE(0), 0x04034b50);
  const files = unzipTextEntries(docx);
  assert.ok(files['word/document.xml']);
  assert.ok(files['word/footer.xml'].includes('PAGE'));
  const xml = files['word/document.xml'];
  for (const value of ['Community Intake Form', 'Applicant name', 'Details', 'SAMPLE ANSWER ONE', 'SAMPLE ANSWER TWO', '18 November 2026']) {
    assert.ok(xml.includes(value), `missing document content: ${value}`);
  }
  assert.ok(xml.includes('w:type="page"'), 'each submission should start on a separate page');
});
