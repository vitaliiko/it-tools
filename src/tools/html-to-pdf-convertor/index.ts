import HtmlIcon from '~icons/mdi/language-html5';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.html-to-pdf-convertor.title'),
  path: '/html-to-pdf-convertor',
  description: translate('tools.html-to-pdf-convertor.description'),
  keywords: ['html', 'pdf', 'print', 'save as pdf', 'document', 'preview', 'converter', 'convertor'],
  component: () => import('./html-to-pdf-convertor.vue'),
  icon: HtmlIcon,
  createdAt: new Date('2026-05-09'),
});
