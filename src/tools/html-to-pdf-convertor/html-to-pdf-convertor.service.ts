export interface PrintOptions {
  title: string
  pageSize: 'a4' | 'letter'
  orientation: 'portrait' | 'landscape'
  margin: 'narrow' | 'normal' | 'wide'
}

interface Html2PdfInstance {
  set: (options: Record<string, unknown>) => Html2PdfInstance
  from: (element: HTMLElement) => Html2PdfInstance
  save: () => Promise<void>
}

declare global {
  interface Window {
    html2pdf?: () => Html2PdfInstance
  }
}

interface RenderDocumentOptions extends PrintOptions {
  autoPrint?: boolean
}

const marginByPreset: Record<PrintOptions['margin'], string> = {
  narrow: '10mm',
  normal: '16mm',
  wide: '24mm',
};

export function buildPreviewHtml(html: string, options: PrintOptions) {
  return buildRenderableHtml(html, { ...options, autoPrint: false });
}

export function buildPrintableHtml(html: string, options: PrintOptions) {
  return buildRenderableHtml(html, { ...options, autoPrint: true });
}

export function extractDocumentTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() ?? '';
}

let html2PdfLoader: Promise<() => Html2PdfInstance> | null = null;

export async function downloadPdfDocument(
  element: HTMLElement,
  filename: string,
  options: PrintOptions,
) {
  const html2pdf = await loadHtml2Pdf();

  await html2pdf()
    .set({
      margin: getPdfMargins(options.margin),
      filename: ensurePdfExtension(filename),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: window.devicePixelRatio > 1 ? 2 : 1,
        useCORS: true,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit: 'mm',
        format: options.pageSize,
        orientation: options.orientation,
      },
      pagebreak: {
        mode: ['css', 'legacy'],
      },
    })
    .from(element)
    .save();
}

function buildRenderableHtml(html: string, options: RenderDocumentOptions) {
  const source = html.trim();
  const title = options.title.trim() || 'HTML to PDF convertor';
  const printCss = createPrintCss(options);
  const autoPrintScript = options.autoPrint ? createAutoPrintScript() : '';

  if (containsHtmlDocument(source)) {
    return injectIntoDocument(source, { title, printCss, autoPrintScript });
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    ${printCss}
  </head>
  <body>
    ${source}
    ${autoPrintScript}
  </body>
</html>`;
}

function containsHtmlDocument(html: string) {
  return /<html[\s>]/i.test(html) || /<!doctype html/i.test(html);
}

function injectIntoDocument(
  html: string,
  {
    title,
    printCss,
    autoPrintScript,
  }: {
    title: string
    printCss: string
    autoPrintScript: string
  },
) {
  let output = html;

  if (/<head[\s>]/i.test(output)) {
    output = output.replace(/<\/head>/i, `${printCss}${ensureDocumentTitle(output, title)}</head>`);
  }
  else if (/<html[\s>][\s\S]*?>/i.test(output)) {
    output = output.replace(/<html[\s>][\s\S]*?>/i, match => `${match}<head><title>${escapeHtml(title)}</title>${printCss}</head>`);
  }
  else {
    output = `<head><title>${escapeHtml(title)}</title>${printCss}</head>${output}`;
  }

  if (autoPrintScript) {
    if (/<\/body>/i.test(output)) {
      output = output.replace(/<\/body>/i, `${autoPrintScript}</body>`);
    }
    else {
      output = `${output}${autoPrintScript}`;
    }
  }

  return output;
}

function ensureDocumentTitle(html: string, title: string) {
  if (/<title[\s>][\s\S]*?<\/title>/i.test(html)) {
    return '';
  }

  return `<title>${escapeHtml(title)}</title>`;
}

function createPrintCss(options: PrintOptions) {
  const margin = marginByPreset[options.margin];

  return `<style data-it-tools-print>
    @page {
      size: ${options.pageSize} ${options.orientation};
      margin: ${margin};
    }

    html {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>`;
}

function createAutoPrintScript() {
  return `<script>
    window.addEventListener('load', () => {
      window.setTimeout(() => {
        window.focus();
        window.print();
      }, 150);
    });
  </script>`;
}

function ensurePdfExtension(filename: string) {
  const trimmed = filename.trim() || 'document';
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
}

async function loadHtml2Pdf() {
  if (window.html2pdf) {
    return window.html2pdf;
  }

  if (!html2PdfLoader) {
    html2PdfLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
      script.async = true;
      script.onload = () => {
        if (window.html2pdf) {
          resolve(window.html2pdf);
          return;
        }

        html2PdfLoader = null;
        reject(new Error('The PDF generator failed to initialize.'));
      };
      script.onerror = () => {
        html2PdfLoader = null;
        reject(new Error('The PDF generator could not be loaded.'));
      };
      document.head.appendChild(script);
    });
  }

  return html2PdfLoader;
}

function getPdfMargins(margin: PrintOptions['margin']) {
  switch (margin) {
    case 'narrow':
      return 10;
    case 'wide':
      return 24;
    case 'normal':
    default:
      return 16;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');
}
