# Property Board

An Obsidian plugin that adds a `.board` filetype. Each board file stores its own settings and views, and opens in a dedicated board view.

## Features

- **Board files** — Create `.board` documents that open in their own view
- **Per-board settings** — Trigger property, scope (all / siblings / folder), and known values
- **Multiple views** — Tabs on the board; currently kanban only
- **Kanban columns** — One column per configured value, plus an **Unknown** column
- **Read-only cards** — Notes that have the trigger property appear as title-only cards
- **Live sync** — Board updates when notes change in the vault

## Installation

### Manual (development)

1. Clone this repository into your vault's `.obsidian/plugins/property-board/` folder.
2. Run `npm install` and `npm run dev` (or `npm run build` for production).
3. Enable **Property Board** under Settings → Community plugins.

> Always develop plugins in a separate dev vault, not your main vault.

## Usage

1. Create a board via the ribbon icon or command palette: **Create new board**.
2. Open the board file (or it opens automatically after create).
3. Use the header gear to configure:
   - **Trigger property** — frontmatter key used for grouping (e.g. `status`)
   - **Limit to** — entire vault, siblings of the board file, or a specific folder
   - **Values** — ordered column list (e.g. `todo`, `in-progress`, `done`)
4. Add frontmatter to notes you want on the board:

```yaml
---
status: in-progress
---
```

5. Add more kanban views with the **+** tab control if needed.

Notes without the trigger property are excluded. Notes with the property but an empty or unrecognized value appear in the **Unknown** column.

## Board file format

Boards are JSON files with a `.board` extension, for example:

```json
{
  "version": 1,
  "name": "New Board",
  "settings": {
    "triggerProperty": "status",
    "limitTo": { "mode": "all" },
    "values": ["todo", "in-progress", "done"]
  },
  "views": [
    { "id": "…", "type": "kanban", "name": "Kanban" }
  ],
  "activeViewId": "…"
}
```

`limitTo` modes:

| Mode | Meaning |
|---|---|
| `all` | All markdown notes in the vault |
| `siblings` | Notes in the same folder as the board file |
| `folder` | Notes under a specific vault folder path |

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production bundle
```

### Deploy to test vault

```bash
npm run deploy
```

By default this builds the plugin and copies `main.js`, `manifest.json`, and `styles.css` to:

`vault/.obsidian/plugins/property-board/`

(in this repo’s local `vault/` folder)

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
