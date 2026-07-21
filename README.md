# Property Kanban

An Obsidian plugin that displays a Kanban board driven by a configurable markdown frontmatter property.

## Features

- **Configurable trigger property** — Group notes by any frontmatter field (e.g. `status`)
- **Custom columns** — Define an ordered list of status values as Kanban columns
- **Drag & drop** — Move cards between columns; updates frontmatter via `processFrontMatter`
- **Status dropdown** — Change status directly from each card using Obsidian's native menu
- **Real-time sync** — Board updates when notes are edited, renamed, or deleted elsewhere
- **Folder filter** — Optionally limit the board to notes under a folder prefix
- **Uncategorized column** — Catch notes with missing or unknown status values

## Installation

### Manual (development)

1. Clone this repository into your vault's `.obsidian/plugins/property-kanban/` folder.
2. Run `npm install` and `npm run dev` (or `npm run build` for production).
3. Enable **Property Kanban** under Settings → Community plugins.

> Always develop plugins in a separate dev vault, not your main vault.

## Usage

1. Open **Settings → Property Kanban** and configure:
   - **Trigger property** (default: `status`)
   - **Statuses** — the column order (e.g. `todo`, `in-progress`, `done`)
2. Add frontmatter to your notes:

```yaml
---
status: in-progress
title: My Task
---
```

3. Open the board via the ribbon icon (grid) or command palette: **Open Property Kanban board**.

## Settings

| Setting | Description |
|---|---|
| Trigger property | Frontmatter key used for column grouping |
| Statuses | Ordered list of column values |
| Folder filter | Optional path prefix (e.g. `Projects/`) |
| Show uncategorized column | Display notes with unknown/missing status |
| Include files without property | Show notes lacking the trigger property |
| Case-sensitive status matching | Exact casing when matching status values |

## How it works

The plugin scans all markdown files in the vault (optionally filtered by folder), reads the trigger property from Obsidian's metadata cache, and groups matching notes into columns. When you drag a card or pick a new status from the dropdown, the plugin updates the note's frontmatter using `app.fileManager.processFrontMatter`. The board listens to `metadataCache` change events to stay in sync with external edits.

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production bundle
```

### Deploy to test vault

Copy the built plugin into a local Obsidian vault for testing:

```bash
npm run deploy
```

By default this builds the plugin and copies `main.js`, `manifest.json`, and `styles.css` to:

`/Users/funapple/Documents/Obsidian/plugin/.obsidian/plugins/property-kanban/`

Override the vault path:

```bash
OBSIDIAN_VAULT=/path/to/vault npm run deploy
# or
npm run deploy -- /path/to/vault
```

To copy without rebuilding (after `npm run dev`):

```bash
npm run deploy:skip-build
```

## License

MIT
