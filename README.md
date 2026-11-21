# @aomc-server/block-ui

A blocky, Minecraft-inspired UI for Preact: components, hooks, helpers and one stylesheet, shared by
the AOMC apps. It is a self-contained, opt-in style: nothing is applied until
an app imports the CSS and sets `data-mode` / `data-style` on `<html>`.

It ships **TypeScript/TSX source**, no build step. Your bundler compiles it with the rest of your app.

- Peer dependencies: `preact ^11.2.0`, `@preact/signals ^2.11.4`.
- Four styles (Bedrock, Windows 98, Windows XP, Modern) × dark/light × palettes (the default is
  "overworld"; apps add their own).
- Demo of everything: `bun run demo` (dev server) / `bun run demo:build`.

## Install

```sh
bun add github:AOMC-Server/block-ui#v0.3.0
bun add preact @preact/signals   # the peers, if the app does not have them yet
```

## Setup

```ts
// main.tsx
import "@aomc-server/block-ui/css";          // fonts + tokens + base + components (one file)
import { render } from "preact";
import { initToggleDrag, installFontScale, Toasts } from "@aomc-server/block-ui";

initToggleDrag();     // lets the knob of a slide toggle be dragged (optional)
installFontScale();   // keeps the pixel font crisp when the pixel ratio changes (optional)

render(<><App /><Toasts /></>, document.getElementById("app")!);   // Toasts: mount once
```

The font is loaded by the CSS (`css/fonts.css` → `../fonts/Minecraft.ttf`, relative, so Vite bundles it).
You can also import pieces: `@aomc-server/block-ui/css/tokens.css` (required), `base.css`,
`buttons.css`, `forms.css`, `surfaces.css`, `feedback.css`, `data.css`, `styles.css`, `fonts.css`.
Import the library CSS **before** your own so your rules win at equal specificity.

`import "@aomc-server/block-ui/css"` type-checks as it is (the export has a `types` condition pointing at
`css/index.d.ts`), so no `declare module` shim is needed. The single files (`/css/tokens.css`, …) are not
typed that way: for those add `"types": ["vite/client"]` (or `/// <reference types="vite/client" />`).

Apps must set the three attributes on `<html>` (see Theming); with no attributes you get dark, bedrock.

### Consumer config

Vite needs almost nothing (verified with `vite build` and the dev server, from a packed install in
`node_modules`): it compiles the `.tsx` inside `node_modules` with the JSX settings of
`@preact/preset-vite`. Notes:

- Apps need `@preact/preset-vite` (or `jsxImportSource: "preact"`) like any Preact app.
- Only one copy of `preact` / `@preact/signals` may be installed; they are peers for that reason. A `file:` or
  linked install brings the library's own copy in its `node_modules`, so tell Vite to use the app's:

  ```ts
  // vite.config.ts
  export default defineConfig({
  	resolve: { dedupe: ["preact", "@preact/signals"] },
  });
  ```

  Without it the app and the library each get a preact, and signals and hooks silently stop working across the
  boundary. (A registry or `github:` install has the peers hoisted next to the app and does not need it; it is
  harmless there.)
- When `vite.config.ts` itself imports library TypeScript (e.g. `prepaintScript` from `/theme`), Vite's default config
  loader cannot bundle it from `node_modules`. Use the runner loader: `vite --configLoader runner`,
  `vite build --configLoader runner` (put it in the package scripts, as the demo here does).
- If dependency pre-bundling ever misbehaves in dev, add `optimizeDeps: { exclude: ["@aomc-server/block-ui"] }`.
- For SSR add `ssr: { noExternal: ["@aomc-server/block-ui"] }` (source is not runnable by Node as is).
- TypeScript: `moduleResolution: "bundler"` (uses the `exports` map), `jsx: "react-jsx"`, `jsxImportSource: "preact"`.
  `"types": ["vite/client"]` lets you import the single CSS files.

**Bun tests.** Bun compiles the library's TSX for tests that import it (anything from the main entry or
`/components`), and needs to be told to use Preact for it. `bunfig.toml` next to the tests:

```toml
# block-ui ships TSX, which Bun compiles like the app's own files: with Preact.
jsx = "react-jsx"
jsxImportSource = "preact"
```

(top level, not under `[test]`). Tests of pure logic can avoid TSX altogether through the subpaths below
(`/width`, `/reorder`, `/markdown`, `/menu`, `/format`, `/csv`, `/errors`, `/hooks`, `/theme`).

**`file:` installs** (`"@aomc-server/block-ui": "file:../block-ui"`, the sibling checkout used while both apps and the
library change together) are _copies_ made by `bun install`, not links: after editing the library run `bun install`
again in each app (in a Bun workspace, at the repository root). The install also adds the library's own
`devDependencies` (biome, vite, typescript, happy-dom, …) to the app's lockfile; that is expected, and goes away
with a registry or `github:` dependency.

**Docker.** A `file:` dependency points outside the app's build context. Give the build the sibling checkout as a
named context and copy it to the same relative place the lockfile expects:

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      additional_contexts:
        block-ui: ../block-ui
```

```dockerfile
# Dockerfile: before `bun install`
COPY --from=block-ui . /block-ui
```

With `WORKDIR /app`, `/block-ui` is where both `file:../block-ui` (an app with one package) and
`file:../../block-ui` (a workspace package in `web/`) point, so the `package.json` stays as it is on the
host. Only the stage that installs devDependencies and builds the web app needs it; a `--production` stage skips the
library (it is a devDependency: the browser bundle is all the final image needs). The library has a `.dockerignore`
(`node_modules`, `demo/dist`, `.git`) so that it is cheap as a build context. Once the dependency is `github:AOMC-Server/block-ui#vX.Y.Z` (or a
registry version) none of this is needed, only `git` in the image for `github:`.

### Before first paint

Put this inline in `<head>` (before the stylesheets) so there is no flash of the wrong look. It is the
output of `prepaintScript()` with its defaults (key `block-ui.appearance`, JSON `{ mode, style, palette }`):

```html
<script>
// Apply the saved appearance before first paint; the app takes over from here (see applyAppearance).
{
	const root = document.documentElement.dataset;
	root.mode = "dark";
	root.style = "bedrock";
	try {
		const STYLES = ["bedrock","win98","xp","modern"];
		const light = matchMedia('(prefers-color-scheme: light)').matches;
		const read = (saved) => saved;
		const a = read(JSON.parse(localStorage.getItem("block-ui.appearance") || "null"), { storage: localStorage, light, location }) || {};
		if (a.mode === "light" || (a.mode === "system" && light)) root.mode = "light";
		else if (a.mode === "dark" || a.mode === "system") root.mode = "dark";
		if (STYLES.includes(a.style)) root.style = a.style;
		if (typeof a.palette === "string" && a.palette) root.palette = a.palette;
	} catch {}
}
</script>
```

Customise the key, how the saved value is read, defaults and allowed palettes with
`prepaintScript({ storageKey, reader, defaults, palettes })` and inject it with Vite:

```ts
// vite.config.ts
import { prepaintScript } from "@aomc-server/block-ui/theme";

plugins: [
	preact(),
	{
		name: "prepaint",
		transformIndexHtml: () => [
			{
				tag: "script",
				injectTo: "head-prepend",
				children: prepaintScript({
					storageKey: "myapp.settings",
					palettes: ["overworld", "nether"],
					// Serialised into the page: self-contained, uses only its arguments.
					reader: (s, { light, location }) =>
						s && { mode: s.mode, style: s.style, palette: s.palette },
				}),
			},
		],
	},
];
```

A `reader` gets the parsed JSON of the key (or `null`) and `{ storage, light, location }`; it returns
`{ mode?: "system"|"dark"|"light", style?, palette? }`. An app that keeps its appearance in several keys, or
decides by route, reads `ctx.storage` and `ctx.location` itself.

## Theming

Three attributes on `<html>` (or on any element, to preview another look):

| attribute      | values                                 |                                                    |
| -------------- | -------------------------------------- | -------------------------------------------------- |
| `data-mode`    | `dark`, `light`                        | the user's choice, or the system's (`resolveMode`) |
| `data-style`   | `bedrock`, `win98`, `xp`, `modern`     | shapes: corners, borders, bevels, fonts            |
| `data-palette` | `overworld` (default), or an app's own | colours                                            |

```ts
import {
	applyAppearance,
	resolveMode,
	prefersLight,
	STYLES,
	MODES,
} from "@aomc-server/block-ui/theme";

applyAppearance({
	mode: resolveMode("system", prefersLight.value),
	style: "xp",
	palette: "nether",
});
```

`palette`: `undefined` leaves it alone, `null` removes the attribute (back to overworld).
`appearance` is a signal holding what was applied. `prefersLight` is a read-only signal that starts following the
system the first time it is read (importing the library does not touch `matchMedia`).

`paletteScope("dye-red")` returns `{ "data-palette", "data-mode", "data-style" }` to spread on an element that
needs a palette of its own. Mode and style are repeated because a palette's tokens are selected by
`[data-palette][data-mode]` on the element itself, and the tokens derived from them (title bars, shadows) are worked
out where the style is declared. It reads `appearance`, so calling it while rendering keeps the element in step with
mode and style changes; before `applyAppearance` has run it uses the attributes on `<html>`.

### Adding a palette

Define the same tokens as the overworld block in `css/tokens.css`, once per mode, in your CSS:

```css
[data-palette="nether"][data-mode="dark"] {
	--ink: #1a0a0a;
	--well: #1a0a0a;
	--s1: #2e1414;
	--s2: #431c1c;
	--s3: #552424;
	--s4: #6e3030;
	--card-lo: #331414;
	--sheen: rgba(255, 220, 200, 0.07);
	--text: #fff;
	--muted: #d4b4ac;
	--faint: #a37f77;
	--focus: #fff;
	--light: #e3d4c6;
	--light-hover: #f1e6dc;
	--light-hi: #f8f1ea;
	--light-lo: #7a5a4a;
	--accent: #167e86;
	--accent-hover: #0f5f66;
	--accent-hi: #2aa5ad;
	--accent-lo: #0a3f44;
	--chrome: #9e2323;
	--yellow: #ffcf5c;
	--link: #5fd6d6;
	--ok: #5fd6d6;
	--err: #ff8a7a;
	--shadow: rgba(0, 0, 0, 0.4);
	--backdrop: rgba(20, 6, 6, 0.75);
	--arrow: url("data:image/svg+xml,…"); /* select arrow, in the text colour */
	color-scheme: dark;
}
[data-palette="nether"][data-mode="light"] {
	/* the same tokens */
}
```

`demo/nether.css` is a complete example. Surfaces are `--ink`/`--well` (outline, recessed) then `--s1`–`--s4`
(layers); `--light*` is the button colour, `--accent*` the primary colour, `--chrome` the title-bar colour of
XP/98. Other tokens apps may set: `--page-max`, `--toast-*`, `--chart-1..7`, `--avatar-1..8`, `--warn`,
`--on-warn`, `--on-accent`, `--danger*`, `--bossbar-yellow/purple`, `--stripe-a/b`, `--tip-tint` (tooltip tint in
win98/xp), `--safe-top/bottom`, `--fs-display`. Style tokens (`--radius`, `--bw`, `--edge-*`, `--head-bg`,
`--surface-shadow` …) are in the four style blocks of `tokens.css`.

### Style-specific details

`css/styles.css` has `@scope ([data-style="win98"]) to ([data-style])` blocks (also xp, modern) for what tokens
cannot express, for the library's components only. An app adds its own selectors in its own `@scope` blocks
(same prelude), so a nested element with another `data-style` still shows its own style.

## Components

Everything is exported from `@aomc-server/block-ui`.

| Component                                                    | Props                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Modal`                                                      | `title, onClose, wide?, footer?, closeOnBackdrop?, class?, children`. Modal stack, focus trap, focus restore, capture-phase Escape (topmost only; ignored while a `Grip` drag inside it is in progress, so that Escape cancels the drag first). `footer` renders `.modal-foot`.                                                                                                                                                                                                                                                                                                                                                                        |
| `Confirm`                                                    | `title, children, confirmLabel? ("Confirm"), cancelLabel?, danger?, busy?, closeOnBackdrop?, onConfirm, onClose`. `closeOnBackdrop` is passed to the `Modal`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `Toasts`, `toast(text, kind?, ms?)`                          | mount `<Toasts />` once. `kind`: `"info"` (default) \| `"ok"` \| `"error"`; `ms` default 3000 (6000 for error). Returns an id for `dismissToast(id)`. Each toast announces itself by role (`alert` for errors, else `status`); the stack is not also a live region.                                                                                                                                                                                                                                                                                                                                                                                    |
| `Page`                                                       | `title, back?: {href,label} \| node, actions?, banner?, embedded?, stack?, class?, children`. Fixed to the window; `embedded` for a page inside an app shell; `stack` spaces children.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Panel`                                                      | `title, onClose, closeText?, class?, tabs?, footer?, resize?, children`. `resize: { width, min, max, onChange(w, commit), onReset, edge?: "left"\|"right" }`. No position of its own.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `createWidthStore`                                           | `{ key, min, max: number \| (windowWidth) => number, default, cssVar?, cssValue? }` → `{ width (signal), min, default, max(), clamp(), set(w, persist?), reset(), dispose() }`; persists to localStorage and mirrors `cssVar` on `<html>`.                                                                                                                                                                                                                                                                                                                                                                                                             |
| `Card`, `Tile`, `TileGrid`                                   | `Card: title?, actions?, footer?, inner?, class?`; `Tile: label, value, hint?`; `TileGrid: tiles[], plain?, min?`. `plain` = flat tiles, bold labels, wider grid (page sections); `min` = narrowest tile in px (`--tile-min`, default 180, plain 200).                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Field`                                                      | `label, hint?, flow?, class?, children`. The label wraps the control; the hint sits outside it and is linked to the control with `aria-describedby`. `flow` = an ordinary block with a margin of its own (between paragraphs), instead of a form field stacked by its `.form`.                                                                                                                                                                                                                                                                                                                                                                         |
| `Badge`, `Count`                                             | `Badge: kind?: "ok"\|"warn"\|"error"\|"running", title?`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `Progress`                                                   | `value?` (0–1; omit = indeterminate), `label?`, `ariaLabel?`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `BossBar`                                                    | `title, fill (0–1), color: "yellow"\|"purple"\|"maintenance", action?, onAction?`; stack in `.bossbar-wrap`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `Segmented<T>`                                               | `value, options: T[], names?: Record<T,string>, onChange, label, small?`. `label` is the accessible name of the group (required; it is not drawn).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `Tabs<T>`                                                    | `tabs: {id,label,href?}[], value, onChange?, label?, center?`. With `href` on any tab: a `<nav>` of links, the current one `aria-current="page"`; a plain click calls `onChange` and prevents navigation. Otherwise a `tablist` of buttons: arrow keys, Home and End move and select; roving `tabindex`.                                                                                                                                                                                                                                                                                                                                               |
| `Toggle`                                                     | `checked, onChange(bool), label?, hint?, disabled?, inline?, bold?, class?, ariaLabel?, title?`. Row by default (`.toggle`, bold label), `inline` = `.check` (`bold` for a list of them; the label keeps the text weight).                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `initToggleDrag(selector = "input.switch")`                  | drag the knob; returns an uninstall function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `SortTh`                                                     | `label, col, sort, dir: "asc"\|"desc", onSort(col), num?, hint?`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Pager`                                                      | `offset, limit, total, onChange(offset)`; `rowKey(e, fn)` for `tr.click`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `Async`, `Loading`, `Empty`, `ErrorBox`                      | `Async: state (useAsync result), children(data), loading?`; `ErrorBox: message, onRetry?`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `Avatar`                                                     | `name, src?, size? (24), round?` (initials on `--avatar-N`, or a pixelated image)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Dot`                                                        | `color, label?, title?, size?`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ConnectionBadge`                                            | `status: "live"\|"down"\|"connecting", labels?, title?`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Chart`                                                      | `kind: "steps"\|"bars", xs, series: {key,label,color,values}[], formatY, formatX, formatTip?, note?, ariaLabel? ("Chart")`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `PreviewSelect<T>`                                           | `options: {value,label,preview,scope?}[], value, onChange, label, wide?`. `scope` = attributes (e.g. `paletteScope(...)`) for a palette wrapper.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ModePicker`, `ChoicePicker<T>`, `StylePicker`               | `ModePicker: value: ModeChoice, onChange, label? ("Colours"), narrow?, class?`. `ChoicePicker: label, value, options: {id,name}[], onChange, hint?, narrow?, class?` (a labelled row of buttons; `ModePicker` is one with `MODES`). `StylePicker: value: StyleId, onChange, label? ("Style"), previewTitle? ("Window"), previewButtons? (["Cancel","OK"]), palette?, class?`: a card per style with a small window drawn in that style; `palette` draws the previews in a palette of their own (`paletteScope`), otherwise they take the page's. Controlled; the app saves the choice and calls `applyAppearance`. `narrow` caps the buttons at 420px. |
| `Grip` + `/reorder`                                          | `Grip: id, label, index, count, onMove(from,to), cross?, itemSelector? ("li")`. Keyboard moves keep the focus on the row after the list re-renders. `startReorder`, `moveItem`, `renumber`. Escape cancels a drag. `CrossDrop: { accepts(id: string), onDrop(id: string, index\|null), rows? }`; targets carry `data-drop-target="id"`.                                                                                                                                                                                                                                                                                                                |
| `PopupText`, `parseText`                                     | markup subset: `**bold**`, `[text](https://…)` (http and https only), line breaks; never HTML. `parseText` returns the lines as parts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `copyText(text, done, notify?)`, `ExpirySelect`, `ShownOnce` | `notify(text, "ok"\|"error")` defaults to `toast()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `moveFocus(menu, step, selector?)`                           | Up/Down in a menu (default `button.menu-item:not(:disabled)`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### Hooks (`/hooks`)

- `useAsync(load \| null, deps, { pollMs?, refresh?: ReadonlySignal, refreshDelayMs? })` → `{ data, error, loading, reload }`.
  `load(signal: AbortSignal)` returns the data or **throws**. Stale answers are ignored, old data stays while
  reloading, an error keeps old data. `null` = nothing to load yet. `refresh`: reload (after 400 ms) when the signal changes.
- `useDebounced(value, ms = 300)`; `usePageOffset(key)` → `[offset, setOffset]` (resets to 0 when `key` changes; plain state).

### Subpath exports

Everything is also importable from the main entry, but the modules without UI have their own subpath, so that unit
tests (and anything else that should not load Preact components) do not pull in TSX:

| subpath                                           | contents                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/theme`                                          | modes, styles, `applyAppearance`, `paletteScope`, `prepaintScript`, `installFontScale`, … |
| `/width`                                          | `createWidthStore`                                                                        |
| `/reorder`                                        | `moveItem`, `renumber`, `startReorder`, `CrossDrop`                                       |
| `/markdown`                                       | `parseText` (the popup markup subset; the parser, not the component)                      |
| `/menu`                                           | `moveFocus`                                                                               |
| `/format`, `/csv`, `/errors`, `/events`, `/hooks` | as listed below                                                                           |
| `/css`, `/css/*`, `/fonts/*`                      | the stylesheet (typed, see Setup), its single files, the font                             |

The components (TSX) come from the main entry only.

### Library helpers

- `/events`: `createEventStream<M>({ url = "/api/events", open?, batchMs?, silenceMs?, retryMs?, onStatus? })`,
  generic over the app's event map `M` (family → data; a topic is `family` or `family:key`). Returns
  `{ subscribe(topic, { onEvent(data, {snapshot}), onError?, poll?, pollMs? }), onStatus(fn), healthy }`.
  Wire format: `GET {url}?topics=a,b:1` streams JSON `{ topic, seq, snapshot, final?, data }` or `{ topic, error }`
  with `error`: `"not found" | "forbidden" | "unknown topic"`. `final` ends the topic after that event. A frame that
  is not such JSON is dropped. Each `subscribe` call is its own follower, even with the same subscription object.

  ```ts
  type Events = { map: MapEvent; revision: RevisionEvent };
  const stream = createEventStream<Events>();
  export const subscribe = stream.subscribe;
  ```
- `/format`: `formatNumber`, `formatInt`, `formatHours`, `formatPercent`, `formatBytes(n, style?)`, `formatDuration`,
  `formatElapsed`, `formatProgress`, `formatTime`, `formatDay`, `formatRelative`, `toYmd`. Numbers and dates follow the
  user's locale; `toYmd` is ISO and UTC.
  **Bytes**: binary (1024 per step). `formatBytes(n)` has IEC labels and one decimal below 100 ("1.5 KiB");
  `formatBytes(n, "kb")` has "KB" labels with 2/1/0 decimals ("2.00 KB").
  **Durations** (in seconds): `formatDuration` is coarse ("3d 4h", "2h 5m", "7m"), `formatElapsed` is precise ("1h 05m",
  "4m 12s", "9s"). `formatRelative(time)` is "30m ago" for a Date or milliseconds.
- `/csv`: `toCsv`. `/errors`: `failureMessage(status, body)`.
- `/theme`: see Theming, plus `installFontScale()`.

## Class reference

**Base** (`base.css`): reset, `[hidden]`, headings (`--display*`), `a`, `code`, global `:focus-visible` (zero specificity, so a control's own `outline: none` wins), scrollbars.
Utilities: `.muted` `.faint` `.hint` `.mono` `.nowrap` `.wrap` `.small-text` `.success` `.warn-text` `.error-text`
`.visually-hidden` `.fade` `.state` `.section-title` `.group` `.toolbar` `.stack` `.spacer` `.pixelated` `.pixel-icon`.
`--note-gap` (e.g. `:root { --note-gap: 4px }`) gives every `.muted`/`.hint` that vertical margin whatever its display; without it only `p.muted`, `p.hint` and `div.hint` have 4px.
The body is **not** `overflow: hidden`; an app shell adds that.

**Buttons**: `.btn` (+ `.primary` `.active` `.danger` `.small` `.close` `.wide`; works on `<a>`), `.plain`, `.link`.
**Segmented/tabs**: `.segmented`, `.tabbar` (trays of `.btn`), `.tabs` (+ `.center`) with `.tab` items (+ `.active`).
**Forms**: inputs/`select`/`textarea` are styled by element; `.field` (`.flow`) `.label` `.field-label` `.form` `.range`;
`input.switch` (slide toggle), `.toggle` (settings row, `.danger`, `.toggle-text`), `.check` (inline switch + label);
range slider by element; `.preview-select*`; `.palette-scope`; the pickers `.choice-picker` (`.narrow`) `.style-picker` `.style-option` `.style-preview` `.preview-window` `.preview-head` `.preview-body`.
**Surfaces**: `.card` (`.inner`) `.card-head` `.card-foot` `.page-actions`; `.panel` `.panel-head` `.panel-body`
`.panel-foot` `.panel-resize` (`.right`); page shell `.page-root` (`.embedded`) `.page-head` `.page` `.page-inner`
`.page-section` `.page-split`; `.tiles` (`.plain`, `--tile-min`) `.tile` `.tile-label` `.tile-value` `.tile-hint`; `.grid`; `.kv` (`.left`);
`.shown-once` `.copy-row` `.popup-text`.
**Feedback**: `.badge` (`.ok` `.warn` `.error` `.running`) `.count` `.chip`; `.progress` > `.bar` (`.indeterminate`)
`.progress-wrap`; `.bossbar` (`.yellow` `.purple` `.maintenance`) `.bossbar-wrap`; `.error-box`; `.conn` `.conn-live`
`.conn-down` `.conn-connecting`; `.toasts` `.toast` (`.ok` `.error`); `.tooltip` `.tip-title` `.tip-line` `.tip-key`;
`.modal-backdrop` `.modal` (`.wide`) `.modal-head` `.modal-body` `.modal-actions` `.modal-foot`; `.menu` `.menu-item`
`.row-menu` `.row-menu-list`.
**Data**: `.table-wrap` (`.flush`) `.table` (`.compact` `.nowrap` `.plain` `.middle` `.no-hover`) with `.num` `.rank` `.actions` `.muted-cell` `tr.click` `tr.me`
`button.sort` (`.active`); `.pager`; `.share-bar`; `.avatar` (`.initials` `.round`); `.dot` `.dots` `.dot-wrap`; `.chart-*`;
`.grip` `.grip-dots` `.sliding` `.dragging` `.drop-target`.

Positioning is deliberately the app's job: `.panel`, `.tooltip`, `.bossbar-wrap` have none. The toast stack is
fixed and moves with `--toast-bottom`, `--toast-left`, `--toast-right`, `--toast-align`
(for example `--toast-left: 8px; --toast-right: 8px; --toast-align: center; --toast-bottom: 64px` for a toast
centred above a toolbar).

### Class semantics

| name                    | meaning                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.app`                  | not defined; the app shell is the app's                                                                                                                              |
| `.page-root`            | fixed full-window column; `.embedded` = ordinary block inside a shell, a plain `--s1` window surface (not the desktop) in win98/xp                                   |
| `.page` / `.page-inner` | `.page` scrolls, padded; `.page-inner` is block, `max-width: var(--page-max, 760px)`, centred; `.stack` spaces children                                              |
| `.page-head`            | a title **bar**: back link, `h1`, `.page-actions` pushed to the end                                                                                                  |
| `.section-title`        | small-caps label, not an `h2`                                                                                                                                        |
| `.field` / label        | flex column with a gap in forms; `.label` and `.field-label` look the same. `.field.flow` (`Field flow`) = a block with `margin: 14px 0`                             |
| `.check`                | inline switch + label, the label in the text's weight, `.check.bold` for bold (`Toggle inline`, `bold`)                                                              |
| slide toggle            | `input.switch`, **not** every checkbox. `.toggle` is the settings row                                                                                                |
| `.tabs` / `.tab`        | `.tabs` = raised tray, `.tab` = light raised item, active stays light (not green)                                                                                    |
| `.toast`                | kinds `info` (default), `ok`, `error`                                                                                                                                |
| `.badge`                | pill; variants are solid: `ok` green, `warn`/`running` `--warn`, `error` red                                                                                         |
| `.progress`             | `.progress > .bar`; `.progress-wrap` = flex column                                                                                                                   |
| `.modal*`               | fixed backdrop; width 600 (`.wide` 1000); footer bar is `.modal-foot`, in-body button row is `.modal-actions`                                                        |
| `.avatar`               | 32px square (bordered); `.initials` colours by name; `.round` for a circle; image is pixelated                                                                       |
| `.count`                | pill; no `margin-left: auto` (add it where you need it)                                                                                                              |
| `.tip-title`            | weight 700                                                                                                                                                           |
| `.table` variants       | `.table-wrap.flush` frameless; `.table.plain` = plain header, vertical-align middle, no row hover (also `.middle`, `.no-hover` alone)                                |
| `.hint`                 | 13px muted; block `p`/`div` get `margin: 4px 0`; `--note-gap` for all elements                                                                                       |
| `.muted`                | colour only; `p.muted` keeps `margin: 4px 0`; `--note-gap` for all elements                                                                                          |
| `.range`                | flex row for date-range controls (Segmented does **not** use it)                                                                                                     |
| `.wrap`                 | `max-width: 420px; overflow-wrap: anywhere`                                                                                                                          |
| `.link`                 | muted underlined action                                                                                                                                              |
| `.tile`                 | label, value (display font, `--yellow`), hint; bevelled, grid `--tile-min` 180px; `.tiles.plain` = flat, bold labels, 200px                                          |
| `.card`                 | s1 raised surface; `.card.inner` = the lighter s2 card                                                                                                               |
| `.dragging`             | only for reorder; the toggle knob drag uses `.knob-drag`                                                                                                             |
| appearance pickers      | `.choice-picker`, `.style-picker` and the previews are the library's (`ModePicker`, `ChoicePicker`, `StylePicker`); the win98/xp preview windows are in `styles.css` |

Notes on moving an app to the library, and between versions, are in [MIGRATION.md](MIGRATION.md) (not part of the
package).

## Development

```sh
bun install
bun test               # DOM tests run on happy-dom (see test-setup.ts)
bun x tsc --noEmit
bun x biome check .
bun run demo           # http://localhost:5173, ?open=modal|wide|confirm|danger|page|toasts
bun run demo:build
```
