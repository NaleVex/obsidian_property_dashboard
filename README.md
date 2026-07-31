# Property Board

Property Board turns your Obsidian notes into live boards driven by frontmatter properties. Use it to track status, group work, or browse notes as Kanban cards or table rows—without leaving the vault.

Each board is a `.board` file that stores its own settings and views. Open it like a normal note; notes in scope that have the trigger property show up automatically and stay in sync as you edit the vault.

**Repository:** https://github.com/NaleVex/obsidian_property_dashboard

## Features

- **Board files** — Per-board config in the vault; create via ribbon, command palette, or file explorer
- **Kanban and table views** — Multiple named views per board; add, rename, duplicate, or delete views
- **Property-driven grouping** — Kanban columns from a trigger property (e.g. `status`), plus an **Unknown** column
- **Scope** — Entire vault, same folder as the board, or a chosen folder
- **Card and column fields** — Show properties, file metadata, or note-body paragraph slices on cards and in table columns
- **Filters and sort** — Multi-rule filters and sorting on both view types; quick search by title or fields
- **Colors** — Column accents and conditional card/row colors
- **Drag to update** — Move Kanban cards between columns to write the trigger property on the note
- **Live sync** — Boards refresh when notes are created, edited, renamed, or deleted
- **Languages** — English, Russian, German, or follow Obsidian’s language

## Roadmap

Ideas on the horizon:

- Card view
- Formula fields
- More language translations

If something would make Property Board more useful for you, feel free to open an issue or start a discussion — happy to hear what you’d like next.

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

5. Add more Kanban or Table views with the **+** tab control if needed.

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

Copyright (C) 2026 NaleVex.

This project is licensed under the GNU General Public License v3.0.
See [LICENSE](LICENSE) for the full text.

If you fork or redistribute this plugin, you must:
- Keep this project under GPL-3.0
- Preserve copyright and license notices
- Clearly state any changes you made
- Credit the original project: https://github.com/NaleVex/obsidian_property_dashboard
