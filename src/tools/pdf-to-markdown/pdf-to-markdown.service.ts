function decodePdfLiteralString(input: string): string {
  let result = '';

  for (let index = 0; index < input.length; index += 1) {
    const current = input[index];

    if (current !== '\\') {
      result += current;
      continue;
    }

    const next = input[index + 1];

    if (next === undefined) {
      break;
    }

    if (/[0-7]/.test(next)) {
      let octal = next;
      let octalLength = 1;

      while (octalLength < 3 && /[0-7]/.test(input[index + 1 + octalLength] ?? '')) {
        octal += input[index + 1 + octalLength];
        octalLength += 1;
      }

      result += String.fromCharCode(Number.parseInt(octal, 8));
      index += octalLength;
      continue;
    }

    const escapedCharacters: Record<string, string> = {
      n: '\n',
      r: '\r',
      t: '\t',
      b: '\b',
      f: '\f',
      '(': '(',
      ')': ')',
      '\\': '\\',
    };

    if (next === '\n') {
      index += 1;
      continue;
    }

    if (next === '\r') {
      if (input[index + 2] === '\n') {
        index += 2;
      }
      else {
        index += 1;
      }
      continue;
    }

    result += escapedCharacters[next] ?? next;
    index += 1;
  }

  return result;
}

function decodePdfHexString(input: string): string {
  const normalized = input.replace(/\s+/g, '');
  const padded = normalized.length % 2 === 0 ? normalized : `${normalized}0`;
  let result = '';

  for (let index = 0; index < padded.length; index += 2) {
    const hexCode = padded.slice(index, index + 2);
    result += String.fromCharCode(Number.parseInt(hexCode, 16));
  }

  return result;
}

function readPdfLiteralString(input: string, startIndex: number): { endIndex: number; value: string } {
  let result = '';
  let depth = 1;
  let index = startIndex + 1;

  while (index < input.length) {
    const current = input[index];

    if (current === '\\') {
      result += current;
      if (index + 1 < input.length) {
        result += input[index + 1];
        index += 2;
        continue;
      }
    }

    if (current === '(') {
      depth += 1;
      result += current;
      index += 1;
      continue;
    }

    if (current === ')') {
      depth -= 1;
      if (depth === 0) {
        return { endIndex: index, value: decodePdfLiteralString(result) };
      }

      result += current;
      index += 1;
      continue;
    }

    result += current;
    index += 1;
  }

  return { endIndex: input.length - 1, value: decodePdfLiteralString(result) };
}

function readPdfHexString(input: string, startIndex: number): { endIndex: number; value: string } {
  const endIndex = input.indexOf('>', startIndex + 1);
  const safeEndIndex = endIndex === -1 ? input.length - 1 : endIndex;
  const rawValue = input.slice(startIndex + 1, safeEndIndex);

  return { endIndex: safeEndIndex, value: decodePdfHexString(rawValue) };
}

function readPdfArray(input: string, startIndex: number): { endIndex: number; values: string[] } {
  const values: string[] = [];
  let index = startIndex + 1;
  let lastTokenWasSpacing = false;

  while (index < input.length) {
    const current = input[index];

    if (current === ']') {
      return { endIndex: index, values };
    }

    if (/\s/.test(current)) {
      index += 1;
      continue;
    }

    if (current === '(') {
      const { endIndex, value } = readPdfLiteralString(input, index);
      if (lastTokenWasSpacing && values.length > 0 && value) {
        values.push(' ');
      }
      values.push(value);
      lastTokenWasSpacing = false;
      index = endIndex + 1;
      continue;
    }

    if (current === '<' && input[index + 1] !== '<') {
      const { endIndex, value } = readPdfHexString(input, index);
      if (lastTokenWasSpacing && values.length > 0 && value) {
        values.push(' ');
      }
      values.push(value);
      lastTokenWasSpacing = false;
      index = endIndex + 1;
      continue;
    }

    const tokenMatch = input.slice(index).match(/^[^\s\[\]()<>/]+/);
    const token = tokenMatch?.[0] ?? current;

    if (/^-?\d+(\.\d+)?$/.test(token)) {
      lastTokenWasSpacing = Math.abs(Number(token)) >= 120;
      index += token.length;
      continue;
    }

    lastTokenWasSpacing = false;
    index += token.length;
  }

  return { endIndex: input.length - 1, values };
}

function appendPendingStrings(pending: string[], target: string[]) {
  if (pending.length === 0) {
    return;
  }

  const nextText = pending.join('').replace(/\s+/g, ' ').trim();
  pending.length = 0;

  if (!nextText) {
    return;
  }

  target.push(nextText);
}

type PdfJsTextItem = {
  hasEOL?: boolean
  height: number
  str: string
  transform: number[]
  width: number
};

function isPdfJsTextItem(item: unknown): item is PdfJsTextItem {
  return typeof item === 'object'
    && item !== null
    && 'str' in item
    && 'transform' in item
    && Array.isArray(item.transform);
}

function shiftAscii(value: string, delta: number): string {
  return [...value].map((character) => {
    const characterCode = character.charCodeAt(0);
    return String.fromCharCode(characterCode + delta);
  }).join('');
}

function getReadableAsciiRatio(value: string): number {
  const meaningfulCharacters = [...value].filter(character => /[A-Za-z\s]/.test(character));

  if (meaningfulCharacters.length === 0) {
    return 0;
  }

  const readableCharacters = meaningfulCharacters.filter(character =>
    character === ' ' || /[AEIOUYaeiouy]/.test(character),
  );

  return readableCharacters.length / meaningfulCharacters.length;
}

function getTextQualityScore(value: string): number {
  const readableRatio = getReadableAsciiRatio(value);
  const letterMatches = value.match(/[A-Za-z]/g) ?? [];
  const spaceMatches = value.match(/\s/g) ?? [];

  return readableRatio + (Math.min(letterMatches.length, 120) / 400) + (Math.min(spaceMatches.length, 60) / 300);
}

function shouldDecodeShiftedAscii(value: string, decodedValue: string): boolean {
  const compactValue = value.replace(/[\s\u0000-\u001f]+/g, '');

  if (compactValue.length < 12) {
    return false;
  }

  if (!/^[\u0000-\u001fA-Za-z0-9%:$&'(),./\-;\]?]+$/.test(compactValue)) {
    return false;
  }

  const originalScore = getTextQualityScore(value);
  const decodedScore = getTextQualityScore(decodedValue);

  return decodedScore >= 0.45 && decodedScore >= originalScore + 0.2;
}

function normalizeExtractedText(value: string): string {
  const shiftedPlusTwentyNine = shiftAscii(value, 29);
  if (shouldDecodeShiftedAscii(value, shiftedPlusTwentyNine)) {
    return shiftedPlusTwentyNine;
  }

  const shiftedMinusThree = shiftAscii(value, -3);
  if (shouldDecodeShiftedAscii(value, shiftedMinusThree)) {
    return shiftedMinusThree;
  }

  return value;
}

async function extractTextWithPdfJs(pdfBuffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');

  const loadingTask = pdfjs.getDocument({
    data: pdfBuffer,
    isEvalSupported: false,
    useWorkerFetch: false,
    disableWorker: true,
  });

  const document = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const lines: string[] = [];
    let currentLine = '';
    let previousY: number | null = null;
    let previousEndX: number | null = null;

    for (const item of textContent.items.filter(isPdfJsTextItem)) {
      const x = item.transform[4] ?? 0;
      const y = item.transform[5] ?? 0;
      const previousLineEnded = item.hasEOL === true;
      const lineBreakByPosition = previousY !== null && Math.abs(y - previousY) > 4;
      const lineBreakByDirection = previousEndX !== null && x < previousEndX - 2;

      if ((lineBreakByPosition || lineBreakByDirection) && currentLine.trim()) {
        lines.push(currentLine.replace(/\s+/g, ' ').trim());
        currentLine = '';
        previousEndX = null;
      }

      const gap = previousEndX === null ? 0 : x - previousEndX;
      const needsSpace = currentLine.length > 0 && gap > Math.max(2, item.height * 0.15);

      if (needsSpace) {
        currentLine += ' ';
      }

      currentLine += item.str;
      previousY = y;
      previousEndX = x + item.width;

      if (previousLineEnded && currentLine.trim()) {
        lines.push(currentLine.replace(/\s+/g, ' ').trim());
        currentLine = '';
        previousEndX = null;
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.replace(/\s+/g, ' ').trim());
    }

    const pageText = lines.join('\n').trim();
    if (pageText) {
      pages.push(pageText);
    }
  }

  await loadingTask.destroy();

  return pages.join('\n\n');
}

export function extractTextFromPdfContentStream(streamContent: string): string {
  const blocks = streamContent.match(/BT[\s\S]*?ET/g) ?? [];
  const extractedLines: string[] = [];

  for (const block of blocks) {
    const pendingStrings: string[] = [];
    const output: string[] = [];
    let index = 0;

    while (index < block.length) {
      const current = block[index];

      if (current === '(') {
        const { endIndex, value } = readPdfLiteralString(block, index);
        pendingStrings.push(value);
        index = endIndex + 1;
        continue;
      }

      if (current === '[') {
        const { endIndex, values } = readPdfArray(block, index);
        pendingStrings.push(...values);
        index = endIndex + 1;
        continue;
      }

      if (current === '<' && block[index + 1] !== '<') {
        const { endIndex, value } = readPdfHexString(block, index);
        pendingStrings.push(value);
        index = endIndex + 1;
        continue;
      }

      if (/\s/.test(current)) {
        index += 1;
        continue;
      }

      const tokenMatch = block.slice(index).match(/^[/A-Za-z0-9*'"]+/);
      const token = tokenMatch?.[0] ?? current;

      if (token === 'Tj' || token === 'TJ') {
        appendPendingStrings(pendingStrings, output);
      }
      else if (token === '\'' || token === '"' || token === 'T*' || token === 'Td' || token === 'TD') {
        appendPendingStrings(pendingStrings, output);
        if (output.length > 0 && output[output.length - 1] !== '\n') {
          output.push('\n');
        }
      }

      index += token.length;
    }

    appendPendingStrings(pendingStrings, output);

    const blockText = normalizeExtractedText(output.join('').replace(/\n{3,}/g, '\n\n').trim());
    if (blockText) {
      extractedLines.push(blockText);
    }
  }

  return extractedLines.join('\n\n').trim();
}

function trimStreamBytes(streamBytes: Uint8Array): Uint8Array {
  let end = streamBytes.length;

  while (end > 0 && [0x0a, 0x0d].includes(streamBytes[end - 1])) {
    end -= 1;
  }

  return streamBytes.slice(0, end);
}

async function decompressFlateStream(streamBytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Flate decompression is not available in this browser.');
  }

  const decompressionStream = new DecompressionStream('deflate');
  const decompressedResponse = new Response(new Blob([streamBytes]).stream().pipeThrough(decompressionStream));
  const decompressedBuffer = await decompressedResponse.arrayBuffer();

  return new Uint8Array(decompressedBuffer);
}

function extractPdfStreamDescriptors(pdfContent: string): Array<{ dictionary: string; endIndex: number; startIndex: number }> {
  const streamDescriptors: Array<{ dictionary: string; endIndex: number; startIndex: number }> = [];
  const streamRegex = /<<(.*?)>>\s*stream\r?\n/gms;

  let match = streamRegex.exec(pdfContent);
  while (match) {
    const startIndex = streamRegex.lastIndex;
    const endIndex = pdfContent.indexOf('endstream', startIndex);

    if (endIndex !== -1) {
      streamDescriptors.push({
        dictionary: match[1] ?? '',
        startIndex,
        endIndex,
      });
    }

    match = streamRegex.exec(pdfContent);
  }

  return streamDescriptors;
}

export async function extractTextFromPdfBuffer(pdfBuffer: ArrayBuffer): Promise<string> {
  const pdfBytes = new Uint8Array(pdfBuffer);
  const pdfContent = new TextDecoder('latin1').decode(pdfBytes);
  const streamDescriptors = extractPdfStreamDescriptors(pdfContent);
  const extractedBlocks: string[] = [];

  for (const streamDescriptor of streamDescriptors) {
    let streamBytes = trimStreamBytes(pdfBytes.slice(streamDescriptor.startIndex, streamDescriptor.endIndex));

    if (/\/FlateDecode\b/.test(streamDescriptor.dictionary)) {
      try {
        streamBytes = await decompressFlateStream(streamBytes);
      }
      catch {
        continue;
      }
    }

    const streamText = new TextDecoder('latin1').decode(streamBytes);
    const extractedText = extractTextFromPdfContentStream(streamText);

    if (extractedText) {
      extractedBlocks.push(extractedText);
    }
  }

  return extractedBlocks.join('\n\n').trim();
}

function isLikelyHeading(line: string): boolean {
  const wordCount = line.split(/\s+/).length;
  const lettersOnly = line.replace(/[^A-Za-z]/g, '');

  return lettersOnly.length >= 3
    && line === line.toUpperCase()
    && wordCount <= 10
    && line.length <= 80
    && !/[.!?]$/.test(line);
}

export function convertPlainTextToMarkdown(text: string): string {
  const normalizedLines = text
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim());

  const markdownBlocks: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }

    markdownBlocks.push(paragraph.join(' '));
    paragraph = [];
  };

  for (const line of normalizedLines) {
    if (!line) {
      flushParagraph();
      continue;
    }

    const bulletMatch = line.match(/^[•◦▪‣\-]\s+(.*)$/);
    const orderedListMatch = line.match(/^(\d+[\.\)])\s+(.*)$/);

    if (bulletMatch) {
      flushParagraph();
      markdownBlocks.push(`- ${bulletMatch[1]}`);
      continue;
    }

    if (orderedListMatch) {
      flushParagraph();
      markdownBlocks.push(`${orderedListMatch[1].replace(')', '.')} ${orderedListMatch[2]}`);
      continue;
    }

    if (isLikelyHeading(line)) {
      flushParagraph();
      markdownBlocks.push(`## ${line}`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();

  return markdownBlocks.join('\n\n').trim();
}

export async function convertPdfBufferToMarkdown(pdfBuffer: ArrayBuffer): Promise<string> {
  let plainText = '';

  try {
    plainText = await extractTextWithPdfJs(pdfBuffer);
  }
  catch {
    plainText = await extractTextFromPdfBuffer(pdfBuffer);
  }

  return convertPlainTextToMarkdown(plainText);
}
