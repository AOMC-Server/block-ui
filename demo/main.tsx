import { effect, signal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import "../css/index.css";
import "./nether.css";
import "./demo.css";
import {
	Async,
	Avatar,
	appearance as appearanceSignal,
	applyAppearance,
	Badge,
	BossBar,
	Card,
	Chart,
	ChoicePicker,
	Confirm,
	ConnectionBadge,
	type ConnectionStatus,
	Count,
	copyText,
	createWidthStore,
	Dot,
	Empty,
	ErrorBox,
	ExpirySelect,
	Field,
	formatBytes,
	formatDuration,
	formatElapsed,
	formatHours,
	formatPercent,
	formatRelative,
	Grip,
	initToggleDrag,
	installFontScale,
	Loading,
	MODES,
	Modal,
	type ModeChoice,
	ModePicker,
	moveFocus,
	moveItem,
	Page,
	Pager,
	Panel,
	PopupText,
	PreviewSelect,
	Progress,
	paletteScope,
	prefersLight,
	resolveMode,
	Segmented,
	ShownOnce,
	SortTh,
	STYLES,
	type StyleId,
	StylePicker,
	Tabs,
	TileGrid,
	Toasts,
	Toggle,
	toast,
	useAsync,
	useDebounced,
	usePageOffset,
} from "../src";

initToggleDrag();
installFontScale();

// ---------------------------------------------------------------------------------------------
// Appearance: kept in localStorage under the key the prepaint script reads.
// ---------------------------------------------------------------------------------------------
const KEY = "block-ui.demo";
const PALETTES = ["overworld", "nether"] as const;

type Saved = { mode: ModeChoice; style: StyleId; palette: string };
const saved = ((): Saved => {
	try {
		return {
			mode: "dark",
			style: "bedrock",
			palette: "overworld",
			...JSON.parse(localStorage.getItem(KEY) || "{}"),
		};
	} catch {
		return { mode: "dark", style: "bedrock", palette: "overworld" };
	}
})();
const choice = signal<Saved>(saved);

const apply = () => {
	const c = choice.value;
	applyAppearance({
		mode: resolveMode(c.mode, prefersLight.value),
		style: c.style,
		palette: c.palette,
	});
};
effect(apply);

function pick(patch: Partial<Saved>) {
	choice.value = { ...choice.value, ...patch };
	try {
		localStorage.setItem(KEY, JSON.stringify(choice.value));
	} catch {}
}

function Switcher() {
	const c = choice.value;
	return (
		<div class="switcher">
			<Segmented
				label="Mode"
				value={c.mode}
				options={MODES.map((m) => m.id)}
				names={Object.fromEntries(MODES.map((m) => [m.id, m.name]))}
				onChange={(mode) => pick({ mode })}
				small
			/>
			<Segmented
				label="Style"
				value={c.style}
				options={STYLES.map((s) => s.id)}
				names={Object.fromEntries(STYLES.map((s) => [s.id, s.name]))}
				onChange={(style) => pick({ style })}
				small
			/>
			<Segmented
				label="Palette"
				value={c.palette}
				options={PALETTES}
				onChange={(palette) => pick({ palette })}
				small
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------------------------
function Section(props: { title: string; children: ComponentChildren }) {
	return (
		<section class="page-section">
			<h2>{props.title}</h2>
			{props.children}
		</section>
	);
}

function Buttons() {
	return (
		<Section title="Buttons">
			<div class="group">
				<button type="button" class="btn">
					Default
				</button>
				<button type="button" class="btn primary">
					Primary
				</button>
				<button type="button" class="btn active">
					Active
				</button>
				<button type="button" class="btn danger">
					Danger
				</button>
				<button type="button" class="btn" disabled>
					Disabled
				</button>
				<button type="button" class="btn small">
					Small
				</button>
				<a class="btn small" href="#buttons">
					Link button
				</a>
				<button type="button" class="btn small close" aria-label="Close">
					×
				</button>
				<button type="button" class="plain link">
					A link-like action
				</button>
			</div>
			<p class="muted">
				Muted text, <span class="faint">faint text</span>,{" "}
				<span class="success">success</span>,{" "}
				<span class="warn-text">warning</span>,{" "}
				<span class="error-text">error</span>, <code>code</code>,{" "}
				<span class="mono">mono</span>.
			</p>
			<h3 class="section-title">Section title</h3>
			<p class="hint">A hint under something.</p>
		</Section>
	);
}

function Forms() {
	const [a, setA] = useState(true);
	const [b, setB] = useState(false);
	const [c, setC] = useState(true);
	const [range, setRange] = useState(40);
	return (
		<Section title="Forms">
			<Field label="Text" hint="A hint under the field.">
				<input type="text" placeholder="Type here" />
			</Field>
			<Field label="Search">
				<input type="search" placeholder="Search…" />
			</Field>
			<Field label="Date">
				<input type="date" />
			</Field>
			<Field label="Select">
				<select>
					<option>One</option>
					<option>Two</option>
				</select>
			</Field>
			<Field label="Textarea">
				<textarea rows={2} placeholder="Several lines" />
			</Field>
			<Field label="Read-only">
				<input type="text" readOnly value="https://example.com/secret" />
			</Field>
			<Field label={`Range (${range})`}>
				<input
					type="range"
					min={0}
					max={100}
					value={range}
					onInput={(e) => setRange(Number(e.currentTarget.value))}
				/>
			</Field>
			<h3 class="section-title">Slide toggles (drag the knob)</h3>
			<Toggle
				checked={a}
				onChange={setA}
				label="Show coordinates"
				hint="A hint under the label."
			/>
			<Toggle checked={b} onChange={setB} label="Maintenance" class="danger" />
			<Toggle checked={c} onChange={setC} label="Inline toggle" inline />
			<Toggle
				checked={false}
				onChange={() => {}}
				label="Inline with a hint and a tooltip"
				hint="The label keeps the body weight."
				title="A tooltip on the whole row"
				inline
			/>
			<Toggle checked disabled onChange={() => {}} label="Disabled" inline />
			<h3 class="section-title">Fields in the flow of a page</h3>
			<p class="muted">
				<code>flow</code> fields are plain blocks with a margin of their own,
				between paragraphs.
			</p>
			<Field label="A flow field" hint="Label 6px above, 14px around." flow>
				<select>
					<option>One</option>
				</select>
			</Field>
			<h3 class="section-title">Toolbar</h3>
			<div class="toolbar">
				<input type="search" placeholder="Filter…" aria-label="Filter" />
				<select aria-label="Sort">
					<option>Newest</option>
				</select>
				<button type="button" class="btn small">
					Apply
				</button>
			</div>
			<h3 class="section-title">Preview select, expiry</h3>
			<PreviewSelectDemo />
			<ExpirySelect
				options={[
					{ label: "1 hour", value: 3600 },
					{ label: "7 days", value: 604800 },
					{ label: "Never", value: null },
				]}
				value={3600}
				onChange={() => {}}
			/>
		</Section>
	);
}

function Pickers() {
	const [mode, setMode] = useState<ModeChoice>("system");
	const [style, setStyle] = useState<StyleId>("modern");
	const [nether, setNether] = useState<StyleId>("xp");
	const [speed, setSpeed] = useState("normal");
	return (
		<Section title="Appearance pickers, embedded page">
			<p class="muted">
				These keep their own state; the switcher above is what changes the page.
			</p>
			<ModePicker value={mode} onChange={setMode} narrow />
			<ChoicePicker
				label="Camera speed"
				value={speed}
				options={[
					{ id: "instant", name: "Instant" },
					{ id: "normal", name: "Normal" },
					{ id: "slow", name: "Slow" },
				]}
				hint="A labelled row of buttons with a hint."
				onChange={setSpeed}
			/>
			<StylePicker
				value={style}
				onChange={setStyle}
				previewTitle="Layers"
				previewButtons={["Edit", "Save"]}
			/>
			<h3 class="section-title">With the nether palette</h3>
			<StylePicker
				label="Style (nether)"
				palette="nether"
				value={nether}
				onChange={setNether}
			/>
			<h3 class="section-title">An embedded page</h3>
			<p class="muted">
				In Windows 98 and XP an embedded page is a plain window surface, not the
				desktop, so loose text stays readable.
			</p>
			<div>
				<Page embedded title="Settings">
					<p>Text straight on the page, with no card around it.</p>
				</Page>
			</div>
		</Section>
	);
}

function PreviewSelectDemo() {
	const [v, setV] = useState("grass");
	const swatch = (color: string) => (
		<span
			class="swatch"
			style={{ width: "24px", height: "24px", background: color }}
		/>
	);
	return (
		<PreviewSelect
			label="Block"
			value={v}
			onChange={setV}
			options={[
				{ value: "grass", label: "Grass", preview: swatch("#52a535") },
				{ value: "water", label: "Water", preview: swatch("#3fc3ef") },
				{
					value: "lava",
					label: "Lava (scoped palette)",
					preview: swatch("#f9801d"),
					scope: paletteScope("nether"),
				},
			]}
		/>
	);
}

function Selectors() {
	const [range, setRange] = useState("30d");
	const [tab, setTab] = useState("one");
	return (
		<Section title="Segmented, tabs">
			<Segmented
				label="Time range"
				value={range}
				options={["7d", "30d", "90d", "all"]}
				names={{ all: "All time" }}
				onChange={setRange}
			/>
			<Tabs
				value={tab}
				tabs={[
					{ id: "one", label: "Sessions" },
					{ id: "two", label: "Chat" },
					{ id: "three", label: "Commands" },
				]}
				onChange={setTab}
			/>
			<p class="muted">Selected tab: {tab}</p>
			<Tabs
				value="x"
				tabs={[
					{ id: "x", label: "Link one", href: "#x" },
					{ id: "y", label: "Link two", href: "#y" },
				]}
				onChange={(id) => toast(`Tab link ${id}`)}
			/>
		</Section>
	);
}

function Surfaces() {
	return (
		<Section title="Cards, tiles, key-values">
			<TileGrid
				tiles={[
					{ label: "Players online", value: "12", hint: "of 40" },
					{ label: "Uptime", value: formatDuration(93_000) },
					{ label: "Playtime", value: formatHours(7153.24) },
					{ label: "Share", value: formatPercent(0.1234) },
				]}
			/>
			<h3 class="section-title">Plain tiles (flat, bold labels, wider grid)</h3>
			<TileGrid
				plain
				tiles={[
					{ label: "Requests", value: "1,204" },
					{ label: "Traffic", value: formatBytes(5_400_000) },
					{ label: "Errors", value: "3", hint: "last 24 hours" },
				]}
			/>
			<div class="page-split">
				<Card
					title="A card"
					actions={
						<button type="button" class="btn small">
							Action
						</button>
					}
					footer={
						<button type="button" class="btn small">
							Footer
						</button>
					}
				>
					<div class="kv">
						<span>Version</span>
						<b>1.21.4</b>
						<span>Uptime</span>
						<b>{formatElapsed(3900)}</b>
						<span>Last seen</span>
						<b>{formatRelative(Date.UTC(2026, 0, 1))}</b>
					</div>
					<Card inner>An inner card, one layer lighter.</Card>
				</Card>
				<Card title="Key-values, left aligned">
					<div class="kv left">
						<span>Size</span>
						<b>{formatBytes(1536)}</b>
						<span>Size (kb style)</span>
						<b>{formatBytes(2048, "kb")}</b>
						<span>ETA</span>
						<b>{formatElapsed(200)}</b>
					</div>
				</Card>
			</div>
			<h3 class="section-title">Tooltip</h3>
			<div class="tooltip" style={{ display: "inline-block" }}>
				<div class="tip-title">Spruce forest</div>
				<div class="tip-line">128 × 96 blocks</div>
				<span class="tip-key">Click to select</span>
			</div>
		</Section>
	);
}

function Small() {
	const [conn, setConn] = useState<ConnectionStatus>("live");
	return (
		<Section title="Badges, chips, avatars, dots">
			<div class="group" style={{ alignItems: "center" }}>
				<Badge>Neutral</Badge>
				<Badge kind="ok">OK</Badge>
				<Badge kind="warn">Warn</Badge>
				<Badge kind="running">Running</Badge>
				<Badge kind="error">Error</Badge>
				<span class="chip">chip</span>
				<a class="chip" href="#chip">
					link chip
				</a>
				<span>
					Items <Count>12</Count>
				</span>
			</div>
			<p class="group" style={{ alignItems: "center" }}>
				<Avatar name="Steve" />
				<Avatar name="Alex" size={32} round />
				<Avatar name="Notch" size={20} />
				<Avatar name="Dinnerbone" size={40} />
				<Dot color="var(--chart-1)" label="Survival" />
				<Dot color="var(--chart-3)" label="Creative" />
				<ConnectionBadge status={conn} />
				<button
					type="button"
					class="btn small"
					onClick={() =>
						setConn(
							conn === "live"
								? "down"
								: conn === "down"
									? "connecting"
									: "live",
						)
					}
				>
					Cycle
				</button>
			</p>
			<ErrorBox
				message="Something went wrong."
				onRetry={() => toast("Retrying…")}
			/>
		</Section>
	);
}

function Progresses() {
	const [p, setP] = useState(0.35);
	return (
		<Section title="Progress, boss bars">
			<Progress value={p} label={`Reading files ${Math.round(p * 100)}%`} />
			<Progress />
			<div class="group">
				<button
					type="button"
					class="btn small"
					onClick={() => setP(Math.min(1, p + 0.15))}
				>
					More
				</button>
				<button type="button" class="btn small" onClick={() => setP(0)}>
					Reset
				</button>
			</div>
			<div class="bossbar-wrap" style={{ marginTop: "14px" }}>
				<BossBar
					color="maintenance"
					fill={1}
					title={
						<>
							<b>Maintenance</b> · only owners can make changes
						</>
					}
					action="Turn off"
					onAction={() => toast("Maintenance off", "ok")}
				/>
				<BossBar
					color="yellow"
					fill={0.6}
					title={
						<>
							As of <b>today</b> · editing is off
						</>
					}
					action="Back to latest"
				/>
				<BossBar color="purple" fill={1} title="Only one upload" />
			</div>
		</Section>
	);
}

type Row = { name: string; hours: number; sessions: number };
const ROWS: Row[] = Array.from({ length: 23 }, (_, i) => ({
	name: `Player${String(i + 1).padStart(2, "0")}`,
	hours: Math.round(((i * 37) % 91) * 10 + 5) / 10,
	sessions: (i * 13) % 47,
}));

function Tables() {
	const [sort, setSort] = useState("hours");
	const [dir, setDir] = useState<"asc" | "desc">("desc");
	const [offset, setOffset] = usePageOffset(`${sort}${dir}`);
	const rows = [...ROWS].sort((a, b) => {
		const x =
			sort === "name"
				? a.name.localeCompare(b.name)
				: (a as never)[sort] - (b as never)[sort];
		return dir === "asc" ? x : -x;
	});
	const onSort = (col: string) => {
		if (col === sort) setDir(dir === "asc" ? "desc" : "asc");
		else {
			setSort(col);
			setDir("desc");
		}
	};
	return (
		<Section title="Table, pager">
			<div class="table-wrap">
				<table class="table">
					<thead>
						<tr>
							<th class="rank">#</th>
							<SortTh
								label="Player"
								col="name"
								sort={sort}
								dir={dir}
								onSort={onSort}
							/>
							<SortTh
								label="Hours"
								col="hours"
								sort={sort}
								dir={dir}
								onSort={onSort}
								num
							/>
							<SortTh
								label="Sessions"
								col="sessions"
								sort={sort}
								dir={dir}
								onSort={onSort}
								num
								hint="Sort by number of sessions"
							/>
							<th />
						</tr>
					</thead>
					<tbody>
						{rows.slice(offset, offset + 5).map((r, i) => (
							<tr
								key={r.name}
								class={`click ${i === 1 ? "me" : ""}`}
								onClick={() => toast(r.name)}
							>
								<td class="rank">{offset + i + 1}</td>
								<td>
									<span
										class="group"
										style={{ flexWrap: "nowrap", alignItems: "center" }}
									>
										<Avatar name={r.name} size={20} /> {r.name}
									</span>
								</td>
								<td class="num">{r.hours.toFixed(1)}</td>
								<td class="num">{r.sessions}</td>
								<td
									class="actions"
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => e.stopPropagation()}
								>
									<details class="row-menu">
										<summary class="btn small">⋯</summary>
										<div class="row-menu-list">
											<button
												type="button"
												onClick={() => toast("Renamed", "ok")}
											>
												Rename
											</button>
											<button
												type="button"
												onClick={() => toast("Failed", "error")}
											>
												Delete
											</button>
										</div>
									</details>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<Pager
				offset={offset}
				limit={5}
				total={ROWS.length}
				onChange={setOffset}
			/>
			<h3 class="section-title">Plain table, flush in a section</h3>
			<div class="page-section">
				<div class="table-wrap flush">
					<table class="table plain compact">
						<thead>
							<tr>
								<th>Route</th>
								<th class="num">Requests</th>
								<th class="num">Traffic</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Tiles</td>
								<td class="num">120,331</td>
								<td class="num">{formatBytes(800_000_000)}</td>
							</tr>
							<tr>
								<td>
									Pages{" "}
									<button type="button" class="btn small">
										Open
									</button>
								</td>
								<td class="num">4,200</td>
								<td class="num">{formatBytes(12_000_000)}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</Section>
	);
}

function Charts() {
	const xs = Array.from({ length: 14 }, (_, i) => Date.UTC(2026, 0, i + 1));
	const wave = (k: number, amp: number) =>
		xs.map((_, i) => Math.round(amp * (1 + Math.sin(i / 2 + k))));
	const day = (x: number) => new Date(x).toISOString().slice(5, 10);
	return (
		<Section title="Charts">
			<Chart
				kind="steps"
				xs={xs}
				series={[
					{
						key: "a",
						label: "Players",
						color: "var(--chart-1)",
						values: wave(0, 12),
					},
					{
						key: "b",
						label: "Staff",
						color: "var(--chart-3)",
						values: wave(2, 4),
					},
				]}
				formatY={(v) => String(v)}
				formatX={day}
			/>
			<h3 class="section-title">Stacked bars</h3>
			<Chart
				kind="bars"
				xs={xs}
				series={[
					{
						key: "a",
						label: "Survival",
						color: "var(--chart-2)",
						values: wave(1, 30),
					},
					{
						key: "b",
						label: "Creative",
						color: "var(--chart-4)",
						values: wave(3, 10),
					},
				]}
				formatY={(v) => `${v}h`}
				formatX={day}
				note={(i) => (i === 3 ? "Server restarted" : null)}
			/>
		</Section>
	);
}

function Overlays() {
	type Open = "none" | "modal" | "wide" | "confirm" | "danger" | "page";
	// ?open=modal (or wide, confirm, danger, page, toasts) starts with that shown.
	const [modal, setModal] = useState<Open>(() => {
		const q = new URLSearchParams(location.search).get("open");
		return q && ["modal", "wide", "confirm", "danger", "page"].includes(q)
			? (q as Open)
			: "none";
	});
	useEffect(() => {
		if (new URLSearchParams(location.search).get("open") === "toasts") {
			toast("Just so you know");
			toast("Saved", "ok");
			toast("Could not save", "error");
		}
	}, []);
	const close = () => setModal("none");
	return (
		<Section title="Modal, confirm, toasts, page">
			<div class="group">
				<button type="button" class="btn" onClick={() => setModal("modal")}>
					Modal
				</button>
				<button type="button" class="btn" onClick={() => setModal("wide")}>
					Wide modal + footer
				</button>
				<button
					type="button"
					class="btn primary"
					onClick={() => setModal("confirm")}
				>
					Confirm
				</button>
				<button
					type="button"
					class="btn danger"
					onClick={() => setModal("danger")}
				>
					Danger confirm
				</button>
				<button type="button" class="btn" onClick={() => setModal("page")}>
					Page shell
				</button>
			</div>
			<div class="group" style={{ marginTop: "10px" }}>
				<button
					type="button"
					class="btn small"
					onClick={() => toast("Just so you know")}
				>
					Toast: info
				</button>
				<button
					type="button"
					class="btn small"
					onClick={() => toast("Saved", "ok")}
				>
					Toast: ok
				</button>
				<button
					type="button"
					class="btn small"
					onClick={() => toast("Could not save", "error")}
				>
					Toast: error
				</button>
				<button
					type="button"
					class="btn small"
					onClick={() => void copyText("https://example.com", "Link copied")}
				>
					Copy text
				</button>
			</div>
			{modal === "modal" && (
				<Modal title="A modal" onClose={close}>
					<p>
						Escape closes it, Tab stays inside, focus returns to the button. The
						backdrop does not close it.
					</p>
					<Field label="Name">
						<input type="text" />
					</Field>
					<div class="modal-actions">
						<button
							type="button"
							class="btn primary"
							onClick={() => setModal("confirm")}
						>
							Open another on top
						</button>
						<button type="button" class="btn" onClick={close}>
							Done
						</button>
					</div>
				</Modal>
			)}
			{modal === "wide" && (
				<Modal
					title="A wide modal"
					wide
					closeOnBackdrop
					onClose={close}
					footer={
						<>
							<button type="button" class="btn" onClick={close}>
								Cancel
							</button>
							<button type="button" class="btn primary" onClick={close}>
								Save
							</button>
						</>
					}
				>
					<p>Clicking the backdrop closes this one (closeOnBackdrop).</p>
				</Modal>
			)}
			{(modal === "confirm" || modal === "danger") && (
				<Confirm
					title={modal === "danger" ? "Delete everything?" : "Continue?"}
					confirmLabel={modal === "danger" ? "Delete" : "Continue"}
					danger={modal === "danger"}
					closeOnBackdrop={modal === "danger"}
					onConfirm={() => {
						toast("Confirmed", "ok");
						close();
					}}
					onClose={close}
				>
					{modal === "danger" ? "This cannot be undone." : "It is a question."}
				</Confirm>
			)}
			{modal === "page" && (
				<Page
					class="demo-page"
					title="A standalone page"
					back={
						<button type="button" class="btn small" onClick={close}>
							← Back to demo
						</button>
					}
					actions={
						<button type="button" class="btn small primary">
							Save
						</button>
					}
					banner={
						<BossBar
							color="yellow"
							fill={0.5}
							title="A banner under the title bar"
						/>
					}
				>
					<section class="page-section">
						<h2>Content</h2>
						<p>
							The content is centred in a column as wide as --page-max (760px by
							default).
						</p>
					</section>
					<section class="page-section">
						<h2>Another section</h2>
						<p class="muted">Page sections are raised surfaces.</p>
					</section>
				</Page>
			)}
		</Section>
	);
}

const panelWidth = createWidthStore({
	key: "block-ui.demo.panelWidth",
	min: 240,
	max: (w) => Math.min(w - 16, 640),
	default: 340,
	cssVar: "--demo-panel-w",
});

function Panels() {
	const [open, setOpen] = useState(true);
	const w = panelWidth.width.value;
	return (
		<Section title="Panel (resizable)">
			<button type="button" class="btn small" onClick={() => setOpen(!open)}>
				{open ? "Close" : "Open"} panel
			</button>
			{open && (
				<div class="panel-stage">
					<Panel
						title="Layers"
						onClose={() => setOpen(false)}
						tabs={
							<div class="tabbar" style={{ margin: "8px 12px 0" }}>
								<button type="button" class="btn small active">
									Layers
								</button>
								<button type="button" class="btn small">
									History
								</button>
							</div>
						}
						footer={
							<>
								<button type="button" class="btn small primary">
									Save
								</button>
								<span class="muted small-text">{w}px wide</span>
							</>
						}
						resize={{
							width: w,
							min: panelWidth.min,
							max: panelWidth.max(),
							onChange: panelWidth.set,
							onReset: panelWidth.reset,
						}}
						class="demo-panel"
					>
						<p class="hint">
							Drag the left edge, or focus it and use the arrow keys.
							Double-click resets.
						</p>
						<ReorderList />
					</Panel>
				</div>
			)}
		</Section>
	);
}

function ReorderList() {
	const [items, setItems] = useState(["Spawn", "Farms", "Nether hub", "Mine"]);
	return (
		<ul class="demo-list">
			{items.map((name, i) => (
				<li key={name} class="card inner demo-row">
					<Grip
						id={`row-${name}`}
						label={name}
						index={i}
						count={items.length}
						onMove={(from, to) => setItems(moveItem(items, from, to))}
					/>
					<span>{name}</span>
					<span class="count" style={{ marginLeft: "auto" }}>
						{i + 1}
					</span>
				</li>
			))}
		</ul>
	);
}

function Menus() {
	return (
		<Section title="Menu, popup text, shown once">
			<div
				class="menu"
				role="menu"
				style={{ maxWidth: "260px" }}
				onKeyDown={(e) => {
					if (e.key === "ArrowDown" || e.key === "ArrowUp") {
						e.preventDefault();
						moveFocus(e.currentTarget, e.key === "ArrowDown" ? 1 : -1);
					}
				}}
			>
				<button type="button" role="menuitem" class="menu-item">
					Copy coordinates
				</button>
				<button type="button" role="menuitem" class="menu-item">
					Measure from here
				</button>
				<button type="button" role="menuitem" class="menu-item" disabled>
					Disabled item
				</button>
			</div>
			<p class="hint">Focus an item and use ↑ ↓ (moveFocus).</p>
			<PopupText
				text={
					"Plain, **bold** and a [link](https://example.com).\nA second line."
				}
			/>
			<ShownOnce
				intro="Copy this now; it will not be shown again."
				value="blk_3f9a1c77d2e04b"
				label="Token"
				copied="Token copied"
			/>
		</Section>
	);
}

function wait<T>(ms: number, value: T) {
	return new Promise<T>((r) => setTimeout(() => r(value), ms));
}

function Loads() {
	const [q, setQ] = useState("");
	const dq = useDebounced(q, 300);
	const [fail, setFail] = useState(false);
	const state = useAsync(async () => {
		const data = await wait(
			500,
			`Result for “${dq}” at ${new Date().toLocaleTimeString()}`,
		);
		if (fail) throw new Error("The server is not reachable.");
		return data;
	}, [dq, fail]);
	return (
		<Section title="useAsync, Async, Loading, Empty">
			<div class="toolbar">
				<input
					type="search"
					placeholder="Type to reload (debounced)"
					value={q}
					onInput={(e) => setQ(e.currentTarget.value)}
				/>
				<Toggle inline checked={fail} onChange={setFail} label="Fail" />
				<button type="button" class="btn small" onClick={state.reload}>
					Reload
				</button>
			</div>
			<Async state={state}>{(data) => <p>{data}</p>}</Async>
			<Loading />
			<Empty />
		</Section>
	);
}

function App() {
	useEffect(() => {
		document.title = "block-ui demo";
	}, []);
	const a = appearanceSignal.value;
	return (
		<>
			<header class="demo-head">
				<h1>block-ui</h1>
				<span class="muted">
					{a ? `${a.mode} · ${a.style} · ${a.palette ?? "overworld"}` : ""}
				</span>
				<Switcher />
			</header>
			<main class="demo-main">
				<Buttons />
				<Forms />
				<Pickers />
				<Selectors />
				<Surfaces />
				<Small />
				<Progresses />
				<Tables />
				<Charts />
				<Panels />
				<Menus />
				<Loads />
				<Overlays />
			</main>
			<Toasts />
		</>
	);
}

render(<App />, document.getElementById("app") as HTMLElement);
