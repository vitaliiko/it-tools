# IT-Tools Tool Integration Reference

Use this file when you need the exact repository integration points for new tools.

## File Map

- `scripts/create-tool.mjs`
  Creates a starter tool folder and injects an import into `src/tools/index.ts`.
- `src/tools/tool.ts`
  Wraps tool definitions with `defineTool(...)` and computes `isNew` from `createdAt`.
- `src/tools/tools.types.ts`
  Defines the required `Tool` fields: `name`, `path`, `description`, `keywords`, `component`, `icon`, and optional `redirectFrom`, `createdAt`.
- `src/tools/index.ts`
  Central registry. Imports each tool, groups them by category, exports `tools` and `toolsWithCategory`.
- `src/tools/tools.store.ts`
  Converts registry entries into localized tools and groups them by category for the rest of the app.
- `src/router.ts`
  Builds routes automatically from the exported `tools` array.
- `src/pages/Home.page.vue`
  Renders the home page cards from `toolStore.tools` and `toolStore.newTools`.
- `src/components/CollapsibleToolMenu.vue`
  Renders the sidebar from categorized tool data.
- `src/modules/command-palette/command-palette.store.ts`
  Builds searchable command-palette options from `toolStore.tools`.
- `locales/en.yml`
  Main source for tool titles and descriptions. The store looks up `tools.<slug>.title` and `tools.<slug>.description`.

## Data Flow

1. Define the tool in `src/tools/<slug>/index.ts`.
2. Register it in a category in `src/tools/index.ts`.
3. The router creates the tool route automatically from `tools`.
4. `tools.store.ts` localizes the name/description and exposes grouped tools.
5. Home page, sidebar, and command palette all read from that shared store output.

Because of this flow, a correctly registered tool is automatically visible on:

- the home page
- the sidebar
- the command palette search

## Minimal `index.ts` Shape

```ts
import { Braces } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.my-tool.title'),
  path: '/my-tool',
  description: translate('tools.my-tool.description'),
  keywords: ['keyword-one', 'keyword-two'],
  component: () => import('./my-tool.vue'),
  icon: Braces,
  createdAt: new Date('2026-05-09'),
});
```

## Notes About Searchability

- The command palette uses tool `name`, `description`, `keywords`, and category.
- Search quality depends heavily on meaningful `keywords`.
- You do not need to edit the command palette store for normal new-tool work.

## Notes About Visibility

- Home page visibility comes from `toolStore.tools`.
- Sidebar visibility comes from `toolStore.toolsByCategory`.
- Both depend on `src/tools/index.ts` category registration.
- A tool import alone is not enough; it must be present inside a category's `components` array.

## Notes About Styling

- Prefer shared components and existing tool patterns over bespoke layout code.
- Keep forms compact and consistent with the surrounding tools.
- Reuse service/model files for parsing and transformation logic when useful.
- Use nearby tools as the style baseline for spacing, field labels, copy, and outputs.
