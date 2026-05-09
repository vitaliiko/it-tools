<script setup lang="ts">
import PdfBoxIcon from '~icons/mdi/file-pdf-box';
import TextareaCopyable from '@/components/TextareaCopyable.vue';
import { formatBytes } from '@/utils/convert';
import { convertPdfBufferToMarkdown } from './pdf-to-markdown.service';

const file = ref<File | null>(null);
const markdown = ref('');
const error = ref('');
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle');

const hasResult = computed(() => markdown.value.length > 0);

async function onFileUpload(uploadedFile: File) {
  file.value = uploadedFile;
  markdown.value = '';
  error.value = '';
  status.value = 'loading';

  try {
    const pdfBuffer = await uploadedFile.arrayBuffer();
    const nextMarkdown = await convertPdfBufferToMarkdown(pdfBuffer);

    if (!nextMarkdown) {
      throw new Error('No extractable text was found in the provided PDF.');
    }

    markdown.value = nextMarkdown;
    status.value = 'success';
  }
  catch (exception) {
    status.value = 'error';
    error.value = exception instanceof Error
      ? exception.message
      : 'The PDF could not be converted to Markdown.';
  }
}

function downloadMarkdown() {
  if (!file.value || !markdown.value) {
    return;
  }

  const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = file.value.name.replace(/\.pdf$/i, '') || 'document';
  anchor.download = `${anchor.download}.md`;
  anchor.click();

  URL.revokeObjectURL(objectUrl);
}
</script>

<template>
  <div flex flex-col gap-4>
    <div mx-auto max-w-700px w-full>
      <c-file-upload
        title="Drag and drop a PDF file here, or click to select a file"
        accept=".pdf,application/pdf"
        @file-upload="onFileUpload"
      />

      <c-card v-if="file" mt-4 flex items-center gap-3>
        <n-icon size="24" :component="PdfBoxIcon" />

        <div flex-1>
          <div font-bold>
            {{ file.name }}
          </div>
          <div text-sm op-70>
            {{ formatBytes(file.size) }}
          </div>
        </div>

        <n-spin v-if="status === 'loading'" size="small" />
      </c-card>

      <c-alert mt-4>
        This converter works locally in your browser. Text-based PDFs should convert much more accurately now, but scanned pages, complex multi-column layouts, and image-only documents may still need cleanup.
      </c-alert>

      <c-alert v-if="status === 'error'" mt-4 type="error">
        {{ error }}
      </c-alert>
    </div>

    <div v-if="hasResult">
      <n-form-item label="Generated Markdown:">
        <TextareaCopyable :value="markdown" language="markdown" copy-message="Copy Markdown" />
      </n-form-item>

      <div flex justify-center>
        <c-button @click="downloadMarkdown()">
          Download `.md`
        </c-button>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
::v-deep(.n-upload-trigger) {
  width: 100%;
}
</style>
