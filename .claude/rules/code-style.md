---
description: TypeScript code style conventions for the VS Code extension
paths:
  - "src/**/*.ts"
---

- Use strict TypeScript (`"strict": true`)
- Prefer `const` over `let`; avoid `var`
- Use VS Code API types from `@types/vscode` — do not redefine
- Error handling: use `vscode.window.showErrorMessage()` for user-facing errors
- Dispose all subscriptions in `deactivate()` or via `context.subscriptions`
