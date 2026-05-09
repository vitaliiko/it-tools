import { describe, expect, it } from 'vitest';
import { buildPreviewHtml, buildPrintableHtml, extractDocumentTitle } from './html-to-pdf-convertor.service';

describe('html-to-pdf-convertor service', () => {
  it('extracts the title from a full html document', () => {
    expect(extractDocumentTitle('<html><head><title>Invoice</title></head><body></body></html>')).toBe('Invoice');
  });

  it('preserves an existing full html document and injects print settings', () => {
    const printableHtml = buildPrintableHtml(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Existing title</title>
          <style>body { background: red; }</style>
        </head>
        <body>
          <main class="page">Report</main>
        </body>
      </html>
    `, {
      title: 'Quarterly <Report>',
      pageSize: 'letter',
      orientation: 'landscape',
      margin: 'wide',
    });

    expect(printableHtml).toContain('<title>Existing title</title>');
    expect(printableHtml).toContain('<style>body { background: red; }</style>');
    expect(printableHtml).toContain('size: letter landscape;');
    expect(printableHtml).toContain('margin: 24mm;');
    expect(printableHtml).toContain('<main class="page">Report</main>');
    expect(printableHtml).toContain('window.print()');
  });

  it('builds a preview document without auto-print script for html fragments', () => {
    const previewHtml = buildPreviewHtml('<section><h1>Preview</h1></section>', {
      title: 'Preview document',
      pageSize: 'a4',
      orientation: 'portrait',
      margin: 'normal',
    });

    expect(previewHtml).toContain('<title>Preview document</title>');
    expect(previewHtml).toContain('<section><h1>Preview</h1></section>');
    expect(previewHtml).not.toContain('window.print()');
  });
});
