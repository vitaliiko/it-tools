---
name: it-tools-add-tool
description: Add or update a tool in the it-tools Vue 3 app. Use when Codex needs to scaffold a new tool, register it so it appears on the home page and in the sidebar, make it searchable in the command palette, add the tool name/description/icon metadata, or follow existing app UI and file conventions in this repository.
---

# IT-Tools Add Tool

Add tools the way this repository expects. Prefer the built-in scaffold, then finish the manual integration steps that make the tool visible across the app.

## Quick Start

1. Choose a kebab-case tool slug such as `json-to-toml`.
2. Run `pnpm script:create:tool <slug>` to scaffold the folder in `src/tools/<slug>/`.
3. Replace the placeholder Vue file with the actual tool UI and logic.
4. Update `src/tools/<slug>/index.ts` so the tool has a real name, description, keywords, icon, and component import.
5. Register the tool in the correct category inside `src/tools/index.ts`.
6. Add locale entries for `tools.<slug>.title` and `tools.<slug>.description` in `locales/en.yml`. Add other locale files only if the task explicitly requires translations.
7. Run validation for the scope of the change, usually `pnpm lint` plus relevant unit or e2e tests.

Read `references/it-tools-tool-integration.md` before editing if you need the exact file map and data flow.

## Required Integration Rules

- Keep the tool directory in `src/tools/<slug>/`.
- Keep the route path equal to `/<slug>`.
- Export a `tool` from `src/tools/<slug>/index.ts` using `defineTool(...)`.
- Provide `name`, `description`, `keywords`, `component`, and `icon`. These fields drive routing, cards, sidebar items, and search.
- Register the exported `tool` in `src/tools/index.ts` under the appropriate category. Without this step, the tool will not appear anywhere.
- Use `translate('tools.<slug>.title')` and `translate('tools.<slug>.description')` in the tool definition when the app already follows that pattern for the tool.
- Choose an icon from the existing icon libraries already used by nearby tools when possible.

## Visibility Checklist

Treat these as acceptance criteria for every new tool:

- Home page: the tool appears in the "All the tools" grid.
- Sidebar: the tool appears under the chosen category.
- Search: the tool is discoverable from the command palette by name, description, and keywords.
- Tool page: the route resolves and shows the tool title and description correctly.

These behaviors are automatic once the tool is correctly defined and registered. Do not patch the home page, sidebar, or command palette unless the task is changing shared behavior.

## Implementation Guidance

### Scaffold

- Prefer `pnpm script:create:tool <slug>` for new tools.
- The scaffold creates:
  - `<slug>.vue`
  - `index.ts`
  - `<slug>.service.ts`
  - `<slug>.service.test.ts`
  - `<slug>.e2e.spec.ts`
- The scaffold also injects an import into `src/tools/index.ts`, but it does not place the tool into a category list or add locale strings. Finish those steps manually.

### Build the UI

- Follow patterns from nearby tools with similar interaction shapes. Reuse shared components like `format-transformer`, `c-card`, inputs, selects, and composables instead of inventing a new layout.
- Preserve the existing visual language: concise forms, shared spacing utilities, Naive UI components, and existing helper components.
- Keep business logic in `.service.ts` or model files when it improves testability.
- Add rare, high-signal comments only when the code would otherwise be hard to read.

### Define Tool Metadata

In `src/tools/<slug>/index.ts`:

- `name`: visible label fallback if translation is missing.
- `description`: visible description fallback if translation is missing.
- `keywords`: extra search tokens for the command palette.
- `icon`: used by cards and the sidebar.
- `createdAt`: optional; if recent, the tool may appear in the "Newest tools" section automatically.

Keep `keywords` practical. Include synonyms and likely user phrasing, not just the slug words.

### Register the Tool

- Add the import if the scaffold did not do it or if you created the files manually.
- Insert the tool into the correct `components` array in `src/tools/index.ts`.
- Pick the category based on existing grouping, not personal preference. Match the nearest comparable tool.

### Localize

- Add `tools.<slug>.title` and `tools.<slug>.description` in `locales/en.yml`.
- If the tool has custom labels or messages that should be localized, add them under the same `tools.<slug>` block.
- Keep locale key naming consistent with the slug and existing patterns.

## Validation

Run the smallest meaningful set:

- `pnpm lint`
- `pnpm test` or a focused Vitest target when service/model logic changed
- `pnpm test:e2e` or the new tool's Playwright spec when UI flow changed materially
- `pnpm build` when you need full integration confidence

Also verify manually that:

- the tool opens at `/<slug>`
- the title and description render correctly
- the tool is present on the home page
- the tool is present in the sidebar category
- the tool can be found from the command palette

## Common Pitfalls

- Creating the folder and `index.ts` but forgetting to add the tool to a category in `src/tools/index.ts`
- Adding locale strings with a key that does not match `tool.path.replace(/\\//g, '')`
- Using weak or empty `keywords`, which makes search worse
- Building a one-off layout instead of reusing the existing app components
- Changing shared navigation/search code even though tool registration already handles visibility
