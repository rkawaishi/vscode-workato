# Workato Recipe Viewer

Workato のレシピ JSON ファイルの可読性を向上させる VS Code / Cursor 拡張機能です。

## 機能

### 1. Pill リファレンスの可読化

`_dp()` で記述されたデータ参照を人間が読める形式に自動変換します。

- **変換前**: `#{_dp('{"pill_type":"output","provider":"slack_bot","line":"fd6582a2","path":["reaction_added","item","channel"]}')}`
- **変換後**: `[fd6582a2].reaction_added.item.channel`

元の `_dp()` テキストは非表示になり、変換後の参照だけが表示されます。ホバーすると Provider / Step / Path の詳細と元のコードを確認できます。

### 2. ステップ装飾

レシピ内の各ステップ（Trigger / Action / Loop / Try / Catch）の開始行に、色付きの背景バンドとラベルを表示します。

| 種別 | 色 | ラベル例 |
|------|-----|---------|
| Trigger | 黄 | ⚡ TRIGGER: slack_bot / new_event |
| Action | 青 | ▶ Step 1: gmail / download_attachment |
| Loop | 紫 | 🔄 LOOP (Step 3) |
| Try | シアン | 🛡 TRY |
| Catch | 赤 | 🚨 CATCH |

### 3. メタデータ自動折りたたみ

`extended_output_schema`、`extended_input_schema`、`visible_config_fields` などの冗長なメタデータセクションをファイルを開いた時に自動で折りたたみます。

### 4. フロー概要パネル（Webview）

`.recipe.json` を開くとサイドにフロー概要パネルが自動表示されます。レシピの全体構造（ステップツリー、コネクション情報）を一目で把握できます。

手動で開く場合: `Cmd+Shift+P` → 「Workato: Open Readable View」

### 5. ファイルアイコンテーマ

Workato のリソースタイプごとに専用アイコンを表示します。

| アイコン | 対象ファイル |
|---------|------------|
| Recipe | `*.recipe.json` |
| Genie | `*.agentic_genie.json` |
| Skill | `*.agentic_skill.json` |
| Connection | `*.connection.json` |
| MCP Server | `*.mcp_server.json` |
| Environment | `.workatoenv` |

## インストール

### VSIX からインストール

```bash
# ビルド
npm install
npm run compile
vsce package

# VS Code
code --install-extension vscode-workato-0.0.1.vsix

# Cursor（GUI）
# Extensions → ... → Install from VSIX... → vscode-workato-0.0.1.vsix を選択
```

### アイコンテーマの有効化

インストール後、アイコンテーマを手動で切り替えてください:

1. `Cmd+Shift+P` → 「Preferences: File Icon Theme」
2. 「Workato File Icons」を選択

> **注意**: このアイコンテーマは全プロジェクトに適用されます。Workato 以外のファイルは汎用アイコンになるため、必要に応じてプロジェクト単位で `.vscode/settings.json` に設定してください:
> ```json
> { "workbench.iconTheme": "workato-icons" }
> ```

## 開発

```bash
npm install          # 依存パッケージのインストール
npm run compile      # TypeScript ビルド
npm run watch        # ウォッチモード
```

デバッグ: VS Code / Cursor でこのプロジェクトを開き、`F5` で Extension Development Host を起動。
