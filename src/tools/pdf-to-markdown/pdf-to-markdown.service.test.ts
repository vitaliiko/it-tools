import { describe, expect, it } from 'vitest';
import { convertPlainTextToMarkdown, extractTextFromPdfContentStream } from './pdf-to-markdown.service';

describe('pdf-to-markdown service', () => {
  describe('extractTextFromPdfContentStream', () => {
    it('extracts literal strings from simple text drawing commands', () => {
      const stream = 'BT /F1 12 Tf 72 720 Td (Hello world) Tj ET';

      expect(extractTextFromPdfContentStream(stream)).toBe('Hello world');
    });

    it('extracts text arrays and keeps spacing hints', () => {
      const stream = 'BT [(First) 180 (item)] TJ T* [(Second) 180 (item)] TJ ET';

      expect(extractTextFromPdfContentStream(stream)).toBe('First item\nSecond item');
    });

    it('decodes escaped characters inside literal strings', () => {
      const stream = String.raw`BT (Line one\012Line two \(draft\)) Tj ET`;

      expect(extractTextFromPdfContentStream(stream)).toBe('Line one Line two (draft)');
    });

    it('decodes hex strings', () => {
      const stream = 'BT <48656c6c6f20504446> Tj ET';

      expect(extractTextFromPdfContentStream(stream)).toBe('Hello PDF');
    });

    it('normalizes the font-encoded output seen in some PDFs', () => {
      const stream = 'BT (7HFKQLFDO6SHFLILFDWLRQIRU3HUVRQDO%LF\\003FOH) Tj ET';

      expect(extractTextFromPdfContentStream(stream)).toBe('TechnicalSpecificationforPersonal Bicycle');
    });
  });

  describe('convertPlainTextToMarkdown', () => {
    it('formats headings, paragraphs and bullet points', () => {
      const input = `
        PROJECT OVERVIEW

        This is the first paragraph.
        It continues on the next line.

        • Fast conversion
        • No upload
      `;

      expect(convertPlainTextToMarkdown(input)).toMatchInlineSnapshot(`
        "## PROJECT OVERVIEW

        This is the first paragraph. It continues on the next line.

        - Fast conversion

        - No upload"
      `);
    });

    it('keeps ordered lists in markdown form', () => {
      const input = `
        1) Open the PDF
        2. Export the text
      `;

      expect(convertPlainTextToMarkdown(input)).toMatchInlineSnapshot(`
        "1. Open the PDF

        2. Export the text"
      `);
    });
  });
});
