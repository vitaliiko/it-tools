<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import { formatBytes } from '@/utils/convert';
import { buildPreviewHtml, buildPrintableHtml, downloadPdfDocument, extractDocumentTitle } from './html-to-pdf-convertor.service';

const html = useStorage(
  'html-to-pdf-convertor--html',
  `<article>
  <h1>HTML to PDF convertor</h1>
  <p>Write or paste your HTML here, then print it as a PDF locally in your browser.</p>
  <ul>
    <li>HTML file upload</li>
    <li>Live preview</li>
    <li>Printable output</li>
  </ul>
</article>`,
);
const documentTitle = useStorage('html-to-pdf-convertor--title', 'my-document');
const pageSize = useStorage<'a4' | 'letter'>('html-to-pdf-convertor--page-size', 'a4');
const orientation = useStorage<'portrait' | 'landscape'>('html-to-pdf-convertor--orientation', 'portrait');
const margin = useStorage<'narrow' | 'normal' | 'wide'>('html-to-pdf-convertor--margin', 'normal');
const file = ref<File | null>(null);
const error = ref('');
const isDownloading = ref(false);
const previewFrame = ref<HTMLIFrameElement | null>(null);

const pageSizeOptions = [
  { label: 'A4', value: 'a4' },
  { label: 'Letter', value: 'letter' },
];

const orientationOptions = [
  { label: 'Portrait', value: 'portrait' },
  { label: 'Landscape', value: 'landscape' },
];

const marginOptions = [
  { label: 'Narrow', value: 'narrow' },
  { label: 'Normal', value: 'normal' },
  { label: 'Wide', value: 'wide' },
];

const previewDocument = computed(() =>
  buildPreviewHtml(html.value, {
    title: documentTitle.value,
    pageSize: pageSize.value,
    orientation: orientation.value,
    margin: margin.value,
  }),
);
const printableHtml = computed(() =>
  buildPrintableHtml(html.value, {
    title: documentTitle.value,
    pageSize: pageSize.value,
    orientation: orientation.value,
    margin: margin.value,
  }),
);

async function onFileUpload(uploadedFile: File) {
  error.value = '';

  try {
    const uploadedHtml = await uploadedFile.text();

    html.value = uploadedHtml;
    file.value = uploadedFile;

    documentTitle.value = extractDocumentTitle(uploadedHtml) || uploadedFile.name.replace(/\.(html?)$/i, '') || documentTitle.value;
  }
  catch {
    error.value = 'The HTML file could not be read.';
  }
}

function openPrintDialog() {
  error.value = '';

  const popup = window.open('', '_blank');

  if (popup === null) {
    error.value = 'Your browser blocked the print window. Allow pop-ups for this site and try again.';
    return;
  }

  popup.document.open();
  popup.document.write(printableHtml.value);
  popup.document.close();
}

async function downloadPdf() {
  error.value = '';

  const previewBody = previewFrame.value?.contentDocument?.body;

  if (!previewBody) {
    error.value = 'The preview is not ready yet. Try again in a moment.';
    return;
  }

  isDownloading.value = true;

  try {
    await downloadPdfDocument(
      previewBody,
      documentTitle.value,
      {
        title: documentTitle.value,
        pageSize: pageSize.value,
        orientation: orientation.value,
        margin: margin.value,
      },
    );
  }
  catch (exception) {
    error.value = exception instanceof Error
      ? exception.message
      : 'The PDF could not be generated.';
  }
  finally {
    isDownloading.value = false;
  }
}
</script>

<template>
  <div flex flex-col gap-4>
    <c-card>
      <div mb-4>
        <c-file-upload
          title="Drag and drop an HTML file here, or click to select a file"
          accept=".html,.htm,text/html"
          @file-upload="onFileUpload"
        />
      </div>

      <div v-if="file" mb-4 rounded-8px border="1px solid rgba(148, 163, 184, 0.28)" bg="rgba(148, 163, 184, 0.08)" p-4 flex items-center gap-3>
        <div flex-1>
          <div font-bold>
            {{ file.name }}
          </div>
          <div text-sm op-70>
            {{ formatBytes(file.size) }}
          </div>
        </div>
      </div>

      <div grid gap-4 md:grid-cols-3>
        <c-input-text
          v-model:value="documentTitle"
          label="Document title"
          placeholder="my-document"
        />

        <c-select
          v-model:value="pageSize"
          label="Page size"
          :options="pageSizeOptions"
        />

        <c-select
          v-model:value="orientation"
          label="Orientation"
          :options="orientationOptions"
        />
      </div>

      <div mt-4 grid gap-4 md:grid-cols="[2fr_1fr]">
        <c-input-text
          v-model:value="html"
          label="HTML input"
          placeholder="Paste your HTML here..."
          multiline
          raw-text
          rows="18"
          test-id="html-to-pdf-convertor-input"
          monospace
        />

        <div flex flex-col gap-4>
          <c-select
            v-model:value="margin"
            label="Margins"
            :options="marginOptions"
          />

          <c-alert>
            Downloading generates the PDF directly, without browser-added site name, URL, or page numbers. Printing still uses the browser print dialog.
          </c-alert>

          <c-alert v-if="error" type="error">
            {{ error }}
          </c-alert>

          <div flex justify-center gap-3>
            <c-button type="primary" :disabled="isDownloading" @click="downloadPdf()">
              {{ isDownloading ? 'Generating PDF...' : 'Download PDF' }}
            </c-button>
            <c-button :disabled="isDownloading" @click="openPrintDialog()">
              Print
            </c-button>
          </div>
        </div>
      </div>
    </c-card>

    <c-card title="Preview">
      <iframe
        ref="previewFrame"
        data-test-id="html-to-pdf-convertor-preview"
        class="preview-frame"
        :srcdoc="previewDocument"
        sandbox="allow-same-origin"
        title="HTML preview"
      />
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.preview-frame {
  display: block;
  width: 100%;
  min-height: 520px;
  border: 1px dashed rgba(148, 163, 184, 0.6);
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.08);
  overflow: hidden;
}
</style>
