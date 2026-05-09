import PdfBoxIcon from '~icons/mdi/file-pdf-box';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.pdf-to-markdown.title'),
  path: '/pdf-to-markdown',
  description: translate('tools.pdf-to-markdown.description'),
  keywords: ['pdf', 'markdown', 'md', 'converter', 'extract', 'text', 'document'],
  component: () => import('./pdf-to-markdown.vue'),
  icon: PdfBoxIcon,
  createdAt: new Date('2026-05-09'),
});
