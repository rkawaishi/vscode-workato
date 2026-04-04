# vscode-workato

VS Code extension that improves readability of Workato recipe JSON files.

## Project Overview

- **Type**: VS Code Extension (TypeScript)
- **Purpose**: Render Workato recipe/skill/connection JSON files in a human-readable format within VS Code
- **Sample Data**: Root directories (`Helpdesk auto reply/`, `Sample project */`, `MCP | Gmail/`, `Home/`) contain real Workato exported assets for testing

## Workato File Types

- `*.recipe.json` — Workflow recipes (triggers + actions)
- `*.connection.json` — API connections
- `*.agentic_skill.json` — Agentic skills
- `*.agentic_genie.json` — Agentic genie configs
- `*.mcp_server.json` — MCP server configs
- `.workatoenv` — Project/workspace metadata

## Build & Run

```bash
npm install          # Install dependencies
npm run compile      # Build TypeScript
npm run watch        # Watch mode
npm run lint         # ESLint
npm run test         # Run tests
code --extensionDevelopmentPath=. # Launch Extension Development Host
```

## Key Commands

- `F5` in VS Code to launch Extension Development Host for testing
- `vsce package` to build .vsix for distribution

## Architecture

- `src/extension.ts` — Extension entry point (activate/deactivate)
- `src/` — TypeScript source
- `package.json` — Extension manifest (contributes, activationEvents)

## Guidelines

- Keep extension activation lightweight — use `onLanguage` or `onView` activation events
- All user-facing strings should support future i18n
- Test with the sample Workato data in root directories
- Recipe JSON files can be deeply nested; handle arbitrary depth
