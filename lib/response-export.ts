import { createCanvas, GlobalFonts, PDFDocument } from '@napi-rs/canvas';
import { deflateRawSync } from 'node:zlib';
import { resolve } from 'node:path';
import type { Field, Response } from '@/types/schema';
import { formatResponseAnswer, getResponseAnswer } from './response-data';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const CONTENT_BOTTOM = 724;
const PDF_FONT_FAMILY = 'Paper2FlowGeist';
type PdfContext = ReturnType<PDFDocument['beginPage']>;

function ensurePdfFontRegistered(): void {
  if (GlobalFonts.has(PDF_FONT_FAMILY)) return;
  const fontPath = resolve(process.cwd(), 'app', 'fonts', 'GeistVF.woff');
  if (!GlobalFonts.registerFromPath(fontPath, PDF_FONT_FAMILY)) {
    throw new Error('The bundled Paper2Flow PDF font could not be loaded.');
  }
}

export function submittedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC';
}

function wrapText(ctx: PdfContext, text: string, maxWidth: number): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(''); continue; }
    let line = '';
    for (const word of words) {
      if (ctx.measureText(word).width > maxWidth) {
        if (line) { lines.push(line); line = ''; }
        let chunk = '';
        for (const character of word) {
          if (ctx.measureText(chunk + character).width > maxWidth && chunk) {
            lines.push(chunk);
            chunk = character;
          } else chunk += character;
        }
        line = chunk;
        continue;
      }
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [''];
}

interface PdfLine { text: string; y: number; font: string; color: string }

/** Professionally typeset response bundle with wrapped answers and page numbers. */
export function formatResponsesPdf(title: string, fields: Field[], responses: Response[]): Buffer {
  ensurePdfFontRegistered();
  const doc = new PDFDocument({ title: `${title} responses`, author: 'Paper2Flow', creator: 'Paper2Flow' });
  const pages: PdfLine[][] = [];
  let current: PdfLine[] = [];
  let y = 126;

  const startPage = () => { if (current.length) pages.push(current); current = []; y = 126; };
  const metric = createCanvas(1, 1).getContext('2d');
  const addMeasuredText = (text: string, font: string, color: string, x = MARGIN, maxWidth = PAGE_WIDTH - MARGIN * 2, lineHeight = 16) => {
    metric.font = font;
    for (const line of wrapText(metric, text, maxWidth)) {
      if (y + lineHeight > CONTENT_BOTTOM) startPage();
      current.push({ text: line, y, font, color });
      y += lineHeight;
    }
  };
  const orderedFields = [...fields].sort((a, b) => a.position - b.position);
  addMeasuredText(title, `bold 17px ${PDF_FONT_FAMILY}`, '#111827', MARGIN, 500, 22);
  y += 10;
  responses.forEach((response, responseIndex) => {
    if (responseIndex > 0 && y > 126) startPage();
    if (responseIndex > 0) {
      current.push({ text: '────────────────────────────────────────────────────────────────────', y, font: `10px ${PDF_FONT_FAMILY}`, color: '#cbd5e1' });
      y += 18;
    }
    addMeasuredText(`Response ${responseIndex + 1}`, `bold 19px ${PDF_FONT_FAMILY}`, '#1e1b4b', MARGIN, 500, 25);
    addMeasuredText(`Submitted ${submittedDate(response.submittedAt)}`, `12px ${PDF_FONT_FAMILY}`, '#475569', MARGIN, 500, 20);
    y += 5;
    for (const field of orderedFields) {
      const answer = formatResponseAnswer(getResponseAnswer(response.payload, field));
      addMeasuredText(field.label, `bold 11px ${PDF_FONT_FAMILY}`, '#334155', MARGIN, 500, 15);
      addMeasuredText(answer || '(No answer)', `12px ${PDF_FONT_FAMILY}`, '#111827', MARGIN, 500, 17);
      y += 8;
    }
  });
  if (current.length || !pages.length) pages.push(current);
  pages.forEach((lines, index) => {
    const ctx = doc.beginPage(PAGE_WIDTH, PAGE_HEIGHT);
    ctx.fillStyle = '#312e81';
    ctx.fillRect(0, 0, PAGE_WIDTH, 82);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 18px ${PDF_FONT_FAMILY}`;
    ctx.fillText('Paper2Flow', MARGIN, 36);
    ctx.font = `11px ${PDF_FONT_FAMILY}`;
    ctx.fillText('FORM RESPONSES', MARGIN, 59);
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold 10px ${PDF_FONT_FAMILY}`;
    ctx.fillText('Submission records', MARGIN, 105);
    for (const line of lines) {
      ctx.fillStyle = line.color;
      ctx.font = line.font;
      ctx.fillText(line.text, MARGIN, line.y);
    }
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(MARGIN, 750); ctx.lineTo(PAGE_WIDTH - MARGIN, 750); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.font = `9px ${PDF_FONT_FAMILY}`;
    ctx.fillText('Story Crown Technologies Ltd · Paper2Flow', MARGIN, 768);
    ctx.textAlign = 'right';
    ctx.fillText(`Page ${index + 1} of ${pages.length}`, PAGE_WIDTH - MARGIN, 768);
    ctx.textAlign = 'left';
    doc.endPage();
  });
  return doc.close();
}

function xmlEscape(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function xmlText(value: string): string {
  return value.split(/\r?\n/).map((line) => `<w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`).join('<w:r><w:br/></w:r>');
}

function paragraph(value: string, style?: string): string {
  return `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}</w:pPr>${xmlText(value)}</w:p>`;
}

function tableRow(label: string, answer: string): string {
  return `<w:tr><w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/><w:shd w:fill="EEF2FF"/></w:tcPr>${paragraph(label, 'Label')}</w:tc><w:tc><w:tcPr><w:tcW w:w="6760" w:type="dxa"/></w:tcPr>${paragraph(answer || '(No answer)')}</w:tc></w:tr>`;
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    const byte = data[index];
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFiles(files: Array<{ name: string; data: string }>): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const raw = Buffer.from(file.data, 'utf8');
    const compressed = deflateRawSync(raw);
    const crc = crc32(raw);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); localHeader.writeUInt16LE(20, 4); localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8); localHeader.writeUInt32LE(crc, 14); localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(raw.length, 22); localHeader.writeUInt16LE(name.length, 26);
    local.push(localHeader, name, compressed);
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); centralHeader.writeUInt16LE(20, 4); centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8); centralHeader.writeUInt16LE(8, 10); centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20); centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(name.length, 28); centralHeader.writeUInt32LE(offset, 42);
    central.push(centralHeader, name);
    offset += localHeader.length + name.length + compressed.length;
  }
  const centralDirectory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralDirectory, end]);
}

/** Generate a standards-based DOCX using a minimal Office Open XML package. */
export function formatResponsesDocx(title: string, fields: Field[], responses: Response[]): Buffer {
  const orderedFields = [...fields].sort((a, b) => a.position - b.position);
  let body = paragraph('Paper2Flow', 'Brand');
  body += paragraph(title, 'Title');
  body += paragraph('Responses · Story Crown Technologies Ltd', 'Subtitle');
  responses.forEach((response, index) => {
    if (index > 0) body += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    body += paragraph(`Response ${index + 1}`, 'Heading1');
    body += paragraph(`Submitted ${submittedDate(response.submittedAt)}`, 'Subtitle');
    body += `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideV w:val="single" w:sz="4" w:color="CBD5E1"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="2600"/><w:gridCol w:w="6760"/></w:tblGrid>`;
    body += orderedFields.map((field) => tableRow(field.label, formatResponseAnswer(getResponseAnswer(response.payload, field)))).join('');
    body += '</w:tbl>';
  });
  body += '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr>';

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.replace('<w:sectPr>', '<w:sectPr><w:footerReference w:type="default" r:id="rId2"/>')}</w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/><w:color w:val="1F2937"/></w:rPr><w:pPr><w:spacing w:after="100"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Brand"><w:name w:val="Brand"/><w:rPr><w:b/><w:color w:val="312E81"/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:color w:val="111827"/><w:sz w:val="34"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:color w:val="312E81"/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Label"><w:name w:val="Label"/><w:rPr><w:b/><w:color w:val="312E81"/></w:rPr></w:style></w:styles>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer.xml"/></Relationships>`;
  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t>Paper2Flow · Story Crown Technologies Ltd · Page </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
  const contentTypesWithFooter = contentTypes.replace('</Types>', '<Override PartName="/word/footer.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>');
  return zipFiles([
    { name: '[Content_Types].xml', data: contentTypesWithFooter },
    { name: '_rels/.rels', data: rels },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/_rels/document.xml.rels', data: documentRels },
    { name: 'word/footer.xml', data: footerXml },
  ]);
}
