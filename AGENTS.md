# Repository Guidelines

## Project Structure & Module Organization
`it-tools` is a Vite + Vue 3 + TypeScript app. Main source lives in `src/`: page shells in `src/pages`, shared UI in `src/ui` and `src/components`, state in `src/stores`, utilities in `src/utils`, and tool implementations in `src/tools/<tool-name>/`. Static assets are under `public/` and `src/assets/`. Locale files live in `locales/` and tool-specific locales may live beside the tool.

## Build, Test, and Development Commands
Use `pnpm` as defined in `package.json`.

- `pnpm install`: install dependencies.
- `pnpm dev`: start the Vite dev server.
- `pnpm build`: run `vue-tsc` and create a production build.
- `pnpm preview`: serve the built app on port `5050`.
- `pnpm test` or `pnpm test:unit`: run Vitest in `jsdom`.
- `pnpm test:e2e`: run Playwright browser tests.
- `pnpm coverage`: generate Vitest coverage output.
- `pnpm lint`: lint `src/` with ESLint.
- `pnpm script:create:tool my-tool-name`: scaffold a new tool in `src/tools/`.

## Coding Style & Naming Conventions
Prettier enforces `tabWidth: 2`, semicolons, single quotes, trailing commas, and a `120` character line width. Run `pnpm lint` before opening a PR. Use kebab-case for tool directories (`src/tools/json-to-toml/`), keep Vue SFCs and related models/services grouped by tool, and prefer descriptive file suffixes such as `.service.ts`, `.models.ts`, and `.test.ts`.

## Testing Guidelines
Unit tests use Vitest and usually live beside the source file, for example `src/utils/base64.test.ts`. Browser-level tests use Playwright with `*.e2e.spec.ts` under `src/`. Add or update tests when behavior changes, especially for new tools and parsing/conversion logic. Run `pnpm test` locally for logic changes and `pnpm test:e2e` for UI flows.

## Commit & Pull Request Guidelines
Recent history follows conventional-style messages such as `fix(locales): ...`, `feat(favorites): ...`, and `chore(readme): ...`. Keep commits focused and scoped where useful. Submit PRs against the `dev` branch, explain what the change solves, link the issue when applicable (`fixes #123`), and include relevant tests. Add screenshots for visible UI changes and note any reviewer focus areas in the PR description.
