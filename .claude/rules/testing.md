---
description: Testing conventions for the VS Code extension
paths:
  - "src/test/**/*.ts"
---

- Use `@vscode/test-electron` for integration tests
- Use the sample Workato JSON files in root directories as test fixtures
- Test recipe parsing with real-world JSON structures (deeply nested `code` blocks)
- Mock VS Code API only when necessary; prefer integration tests
