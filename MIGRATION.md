# Migration notes

Per-app notes on moving to block-ui and between its versions. Not part of the published package;
[README.md](README.md) is the reference.

## 0.3.0 to 0.3.1

Documentation only. `file:` installs are symlinked, not copied, and under `bun test` they give the library its own
`preact` / `@preact/signals`; the README now explains it and has the preload that fixes it (see "`file:` installs").
Apps that depend on the library through `file:` and test code that watches library signals (`appearance`,
`prefersLight`) want that preload. No code change otherwise.

## 0.2.0 to 0.3.0

Imports of removed names fail at build time; the rest are behaviour changes to look for.

### Removed or renamed

| was                                                                                                                                             | now                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `events`, `subscribe`, `onConnection` (shared stream)                                                                                           | `createEventStream<Events>()` and its `subscribe` / `onStatus`                                                   |
| `RangePicker`                                                                                                                                   | `Segmented`                                                                                                      |
| `Segmented` without `label`                                                                                                                     | `label` is required                                                                                              |
| `TOAST_MS`, `clearToasts`                                                                                                                       | not exported (`dismissToast(id)` stays)                                                                          |
| `dropIndex`, `insertIndex`, `niceMax`, `safeHref`, `parseInline`, `avatarColorIndex`, `csvCell`, `fontSizeFor`, `DEFAULT_MODE`, `DEFAULT_STYLE` | not exported (`parseText`, `toCsv`, `installFontScale`, `prepaintScript` cover their uses)                       |
| `@aomc-server/block-ui/components`                                                                                                              | `@aomc-server/block-ui`                                                                                          |
| `formatShortTs`, `formatShortDate`, `parseTs`, `secsToHours`                                                                                    | not in the library (log-timestamp helpers); see below                                                            |
| `formatRemaining(ms)`                                                                                                                           | `formatDuration(Math.ceil(ms / 60_000) * 60)`: "3h 5m" for "3h", "2d 4h" for "2d"                                |
| `formatEta(seconds)`                                                                                                                            | `formatElapsed(Math.ceil(seconds))`: "3m 20s" for "3 min 20 s", "25m 00s" for "25 min", "1h 05m" for "1 h 5 min" |
| `formatRelative(ts: string \| null)`                                                                                                            | `formatRelative(time: Date \| number \| null)`: pass `parseTs(ts)` (a local helper) for log timestamps           |
| `prefersLight` (a writable signal)                                                                                                              | a read-only signal; it starts following the system the first time it is read                                     |
| `.mode-picker` (CSS class of `ChoicePicker` / `ModePicker`)                                                                                     | `.choice-picker`                                                                                                 |

The log-timestamp helpers, for apps that need them (blocklogs):

```ts
export const parseTs = (ts: string): Date =>
	/[zZ]|[+-]\d\d:?\d\d$/.test(ts)
		? new Date(ts)
		: new Date(`${ts.replace(" ", "T")}Z`);
export const formatShortTs = (ts: string | null): string =>
	ts ? ts.slice(0, 16) : "-";
export const formatShortDate = (ts: string | null): string =>
	ts ? ts.slice(0, 10) : "-";
export const secsToHours = (secs: number): number => secs / 3600;
// formatRelative(ts ? parseTs(ts) : null)
```

### Changed behaviour

- **Formatters**: `formatInt`, `formatHours`, `formatPercent`, `formatBytes` and `formatProgress` follow the
  user's locale like `formatNumber` (`formatInt` and `formatHours` were always en-US, `formatPercent` and
  `formatBytes` never grouped). `formatDuration` leaves out a zero second unit ("1h", "3d").
- **`Tabs`**: tabs with an `href` are a `<nav>` of links with `aria-current="page"` (no `role="tab"`); without
  one it is a `tablist` with arrow-key navigation and a roving `tabindex`. CSS that targeted `[role="tab"]`
  on the links needs `.tab` instead.
- **`Field`**: the markup is `div.field > label.field-control > (span.label, control)` with the hint after the
  label (`span.hint#id`), linked by `aria-describedby`. Selectors such as `label.field` or `.field > .label`
  no longer match; the library's own CSS handles both shapes of `.field`.
- **`Toasts`**: the stack has no `aria-live`; each toast announces itself by role.
- **`paletteScope`** reads `appearance.value`: call it while rendering and the element follows mode and style
  changes. `StylePicker` previews and `PreviewSelect` options built that way update by themselves.
- **`createEventStream`**: a frame that is not valid JSON is dropped (and does not count as a sign of life); the
  same subscription object passed to two `subscribe` calls is two followers; a subscriber that joins an open
  stream gets a copy of the last event's data.
- **`useAsync`**: data and error are cleared when `load` becomes `null`. `deps` must keep its length.
- **`Modal`**: Escape does not close it while a list drag (`Grip`) inside is in progress; the drag takes the key.
- **`createWidthStore`**: a saved width is clamped to the current `[min, max]` on creation.
- **`Chart`**: new `ariaLabel` prop.

## Moving the apps onto block-ui (0.2.0)

### blockmap (aomc-map)

- Imports: `ui/Modal` → `Modal`; `ui/Toast` + `state.notice`/`showNotice(text, kind)` → `toast(text, kind)`
  (`"info"` default, `"error"`; keep `showNotice` as a one-line wrapper) and mount `<Toasts />`; `ui/Panel` →
  `Panel` with `resize` from `createWidthStore({ key: "blockmap.panelWidth", min: 320, max: (w) => Math.max(320, Math.min(w - 16, w * 0.7, 900)), default: 400, cssVar: "--panel-w", cssValue: (w) => \`min(\${w}px, calc(100vw - 16px))\` })`  (and`setPanelWidth`→`store.set`); `ui/Page`→`Page` (`back={{ href: "/", label: "Map" }}`, `banner={<MaintenanceNotice />}`, mount `<Toasts />`yourself);
 `RangePicker`→`Segmented`(or the alias);`statsCommon.TileGrid`→`TileGrid`(tiles are now`{ label, value, hint? }`, `.stats-grid`/`.stats-tile`/`.stats-value`→`.tiles`/`.tile`/`.tile-value`);
  `statsCommon.SortHeader`→`SortTh` (`column.key`→`col`, `column.label`→`label`, `column.hint`→`hint`, `dir="desc"`, `num`); `useStats(call, deps)`→
 `useAsync(async () => { const r = await attempt(call); if (!r.ok) throw new Error(r.error); return r.body; }, deps)`;
  `Chart`, `Grip`, `reorder`, `PreviewSelect`, `PopupText`/`markdown`, `moveFocus`, `copyText`, `ExpirySelect`, `ShownOnce`, `toggleDrag`, `fontScale`, `format`, `events`, `errors.failureMessage`, `theme`come from the package.
 `copyText(text, done)` now toasts by itself.
- `theme.ts`: keep `DIMENSION_THEME_NAMES`, `savePalette`, `PALETTE_KEY` locally; `dyeScope(dye)` → `paletteScope(dye ? \`dye-\${dye}\` : undefined)`;
  `applyAppearance({ mode, palette, style })`is compatible.`PreviewSelect`option`dye`→`scope: paletteScope(\`dye-\${dye}\`)`  (wrap the`.dye-scope`/`.strong`class around it yourself if you need`--dye-k`; the library wrapper is `.palette-scope`).
- CSS: replace the token blocks, base rules, `.btn` … `.progress`, `.toast`, `.bossbar`, `.panel`/`.modal`/`.page-*` surface rules, tables, charts and generic `@scope` rules with
  `import "@aomc-server/block-ui/css"`. Keep: nether/end/unknown + dye palettes (selectors `[data-palette="nether"][data-mode="dark"]` …; remember `--map-bg`, `--dye*`), `--hotbar-h`, `--above-hotbar`, `--panel-w`, `.app`
  (`html, body, #app { overflow: hidden; height: 100%; overscroll-behavior: none }` now yours), docks, hotbar, popup, context menu, map-only `@scope` rules
  (and `--tip-tint: var(--dye)` for the tooltip tint), positions of `.panel` (`position: absolute; top/right/bottom; width: var(--panel-w)`), `.bossbar-wrap` (`position: absolute`), `.page-root` background tweaks.
- Class renames: `.stats-table` → `.table`, `.stats-table-wrap` → `.table-wrap`, `.stats-num` → `.num`, `.stats-rank` → `.rank`, `.stats-sort` → `.sort` (`th > button.plain.sort`), `.stats-me` → `tr.me`,
  `.stats-range` (fieldset) → `.segmented-set` (add your own `margin: 0 auto 16px`), `.toggle` rows keep working through `Toggle`; **every** `<input type="checkbox">` now needs `class="switch"` (use `Toggle`);
  `.toggle.maintenance-on` → `.toggle.danger`; `.new-link` → `.shown-once`, `.link-row` (in `ShownOnce`) → `.copy-row`; `.dye-scope` in `PreviewSelect` → `.palette-scope`;
  `data-drop-layer` → `data-drop-target` (`CrossDrop.accepts/onDrop` take a **string** id, add `rows: ".features > li:not(.muted)"`); `.toast` is no longer positioned by itself: set `--toast-*` (see above);
  `.tabs.tabbar` + `plain tab` buttons → `Tabs` (or keep the markup: `.tabs` still works, drop `.tabbar`; blockmap's `margin: 0 auto 16px` → `.tabs.center` + margin);
  `.badge.warn/.error` now solid colours; `.bossbar` unchanged; `.modal-backdrop` is `position: fixed` (was absolute inside `.app`).
- Modal props are the same (`title, onClose, children`); new: `wide`, `footer`, `closeOnBackdrop`.
- Layout variants that keep the old look: `Field flow` / `.field.flow` for the settings and form fields between paragraphs, `--note-gap: 4px` on `:root` for the `.muted`/`.hint` margins, `TileGrid plain`, `.table-wrap.flush` + `.table.plain` for tables in a page section, `Toggle inline` for the `.check` rows (plain `input.switch` stays right for a bare switch in a table cell or a list row), `ModePicker`/`ChoicePicker`/`StylePicker` for the settings page (`StylePicker previewTitle="Layers" previewButtons={["Edit", "Save"]}`).
- Storage keys are the app's own: `blockmap.settings`, `blockmap.palette`, `blockmap.position`, `blockmap.panelWidth` (the library's `block-ui.appearance` is only the `prepaintScript` default).
- Dropped from the package (stay in the app): `formatEventTime/Day` (use `formatTime(r.exportedAt ?? r.createdAt)`), `inviteProblem`, `DIMENSION_THEME_NAMES`.

### blocklogs (logs_parser)

- Format names: `int` → `formatInt`, `hours` → `formatHours`, `secsToHours`, `percent` → `formatPercent`, `duration` → `formatElapsed`, `bytes` → `formatBytes` (same strings),
  `parseTs`, `shortTs` → `formatShortTs`, `shortDate` → `formatShortDate`, `relative` → `formatRelative`, `ymd` → `toYmd`. `csvCell`/`toCsv` from `/csv` (`geoCsv` stays in the app).
- `events.ts`: `createEventStream<Events>()` with your `Events` map (`{ data: …, log: … }`); `onConnection(fn)` → `stream.onStatus(fn)`; the options (`onStatus`, …) are unchanged; `onError` may now also get `"not found" | "forbidden"`.
- `hooks.ts`: `useFetch(path, params, pollMs, live)` → `useAsync((signal) => getJson<T>(buildUrl(path, params), signal), [url], { pollMs, refresh: live ? dataRev : undefined })`
  (keep a thin `useFetch` wrapper; `path === null` → pass `null`). `Fetched<T>` = `AsyncState<T>`. `useDebounced`, `usePageOffset` move unchanged.
- `Modal`/`Confirm`: same props plus `closeOnBackdrop` — logs closed on backdrop press, so pass `closeOnBackdrop` (also to the delete `Confirm`); `footer` now renders `.modal-foot`. Escape/focus handling is stricter (focus trap, topmost only). `Confirm` same props.
- `Toast`: `toast(text, "ok" | "err")` → `toast(text, "ok" | "error")`; `.toast.err` → `.toast.error`; `<Toasts />` is the package's.
- `Check` (`.check .box`) → `<Toggle inline bold checked onChange label />` (`bold` keeps the label weight of the sidebar and form rows; drop it for body text); call `initToggleDrag()` if you want dragging. `.check input`/`.box` CSS goes.
- `Page({ title, actions })`: now a title bar; use `<Page embedded …>` inside the `.app` grid (and `--page-max: 1400px`, `stack` for the old `.page-inner` flex gap). In win98/xp an embedded page is a plain window surface, so loose text is readable.
- The settings page's mode and style pickers are `ModePicker narrow` and `StylePicker previewTitle="Players" previewButtons={["Sync", "Save"]}`; delete the copied `.mode-picker`, `.style-picker`, `.style-option`, `.style-preview`, `.preview-*` CSS.
  `.page-root { overflow-y: auto }` in the app shell if the shell scrolls the page.
- `Card`, `Tile` (`value`/`label`, order is now label then value; `hint` is a line below), `Field` (`.field-label` → `.label`; hint class `.hint`), `Pager`, `SortTh` (same props, `+ hint?`), `ErrorBox`, `Empty`, `Loading`, `Async`
  (`state` = `useAsync` result), `Avatar` (same, `name, size`; colours now `--avatar-N`), `Chart` (identical) come from the package. `Dot({ id, label })` → `Dot({ color: serverColor(id), label: serverName(id) })`; `ServerDots`, `PlayerLink`, `Link`, `rowKey` (package has `rowKey`) stay or move as noted.
- `ActivityLog`'s `ConnBadge` → `<ConnectionBadge status={…} />` (`"live" | "down" | "connecting"`). `SyncProgress` → `<Progress value={p.total ? p.done / p.total : undefined} label={…} />` (`.progress > div` → `.progress > .bar`).
- `RangePicker` (presets + date inputs) is app-specific: build it with `Segmented` + `.range` for the date inputs (`input[type=date]` is styled by the library).
- CSS: `.stats-table` → `.table`, `.stats-table .num` → `.table .num` (`.sort` buttons as before), `.err` → `.error-text`, `.ok` → `.success`, `.tab.active` is light raised, not green;
  `.badge.running` uses `--warn` (was `#c9a400`), avatars use `--on-accent` (was `#fff`); `.section-title` is a small-caps label; `.tabs` is a raised tray (no `margin: auto`).
  Inputs are `width: 100%` by default; inside `.toolbar`/`.range` they are `auto`. Keep the app-only CSS (`.sidebar`, `.nav-link`, `.server-*`, `.activity*`, `.geo`, …) and add `data-mode="dark" data-style="bedrock"` on `<html>` (or just rely on the defaults).

## Decisions on names that collided (0.2.0)

| name                                   | decision                                                                                                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.app`                                 | not defined; the app shell is the app's                                                                                                                                                                           |
| `.page-root`                           | fixed full-window column with the blockmap pattern; `.embedded` = ordinary block inside a shell, a plain `--s1` window surface (not the desktop) in win98/xp                                                      |
| `.page` / `.page-inner`                | `.page` scrolls, padded; `.page-inner` is block, `max-width: var(--page-max, 760px)`, centred; `.stack` spaces children                                                                                           |
| `.page-head`                           | a title **bar** (blockmap): back link, `h1`, `.page-actions` pushed to the end                                                                                                                                    |
| `.section-title`                       | small-caps label (blockmap), not an `h2`                                                                                                                                                                          |
| `.field` / label                       | flex column with a gap in forms, `.label` (blockmap) and `.field-label` (logs) look the same. `.field.flow` (`Field flow`) = a block with `margin: 14px 0` and the label 6px above, between paragraphs (blockmap) |
| `.check`                               | inline switch + label, the label in the text's weight, `.check.bold` for bold (`Toggle inline`, `bold`). The logs "box" checkbox is gone                                                                          |
| slide toggle                           | `input.switch`, **not** every checkbox. `.toggle` stays the settings row (blockmap's meaning)                                                                                                                     |
| `.tabs` / `.tab`                       | `.tabs` = raised tray, `.tab` = light raised item, active stays light (not green)                                                                                                                                 |
| `.toast`                               | kinds `info` (default), `ok`, `error`. logs' `.err` is now `.error`                                                                                                                                               |
| `.badge`                               | blockmap pill; variants are solid: `ok` green, `warn`/`running` `--warn`, `error` red                                                                                                                             |
| `.progress`                            | `.progress > .bar` (blockmap). logs' bare `> div` child needs class `bar`. `.progress-wrap` = flex column                                                                                                         |
| `.modal*`                              | fixed backdrop; width 600 (`.wide` 1000); footer bar is `.modal-foot`, in-body button row is `.modal-actions`                                                                                                     |
| `.avatar`                              | 32px square (bordered); `.initials` colours by name; `.round` for a circle; image is pixelated                                                                                                                    |
| `.count`                               | pill; no `margin-left: auto` (add it where you need it)                                                                                                                                                           |
| `.tip-title`                           | weight 700                                                                                                                                                                                                        |
| `.stats-table` / `.stats-num` / `.num` | one set: `.table` + `.num` (below)                                                                                                                                                                                |
| `.table` variants                      | `.table-wrap.flush` frameless; `.table.plain` = plain header, vertical-align middle, no row hover (also `.middle`, `.no-hover` alone); for tables straight in a `.page-section`                                   |
| `.hint`                                | 13px muted; block `p`/`div` get `margin: 4px 0`; `--note-gap` for all elements                                                                                                                                    |
| `.muted`                               | colour only; `p.muted` keeps `margin: 4px 0`; `--note-gap` for all elements                                                                                                                                       |
| `.range`                               | logs' flex row for date-range controls (Segmented does **not** use it)                                                                                                                                            |
| `.wrap`                                | logs' meaning: `max-width: 420px; overflow-wrap: anywhere`                                                                                                                                                        |
| `.link`                                | blockmap's muted underlined action                                                                                                                                                                                |
| `.tile`                                | label, value (display font, `--yellow`), hint; bevelled, grid `--tile-min` 180px; `.tiles.plain` = flat, bold labels, 200px (blockmap); replaces `.stats-tile`/`.stats-grid` and logs' `.tile`                    |
| `.card`                                | s1 raised surface (logs); `.card.inner` = the lighter s2 card of blockmap (`.layer` etc.)                                                                                                                         |
| `.dragging`                            | only for reorder; the toggle knob drag uses `.knob-drag`                                                                                                                                                          |
| appearance pickers                     | `.mode-picker`, `.style-picker` and the previews are the library's (`ModePicker`, `StylePicker`); the win98/xp preview windows are in `styles.css`                                                                |
