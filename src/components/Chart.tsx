import { useEffect, useRef, useState } from "preact/hooks";

export type ChartSeries = {
	key: string;
	label: string;
	/** A CSS colour. */
	color: string;
	values: number[];
};

/** Width until the chart has been measured; the drawing is then as wide as the chart, in pixels. */
const DEFAULT_W = 640;
const H = 240;
const PAD = { right: 12, top: 10, bottom: 28 };
const PLOT_H = H - PAD.top - PAD.bottom;

/** A round number at or above `max`, so the axis ends on a clean value. */
function niceMax(max: number): number {
	if (max <= 0) return 1;
	const pow = 10 ** Math.floor(Math.log10(max));
	// Steps whose quarters are tidy numbers, as the axis has ticks at 0, 1/4, 1/2, 3/4 and the top.
	for (const step of [1, 1.2, 1.6, 2, 2.4, 2.8, 3.2, 4, 4.8, 6, 8, 10])
		if (step * pow >= max) return step * pow;
	return 10 * pow;
}

/**
 * The value axis for data between `min` and `max`: it starts at `min` rounded down to a tick, and
 * is a round number long, so the ticks are tidy and the data fills the height. A `min` of 0 gives
 * the axis from 0 to `niceMax(max)`.
 */
function yAxis(max: number, min: number): { low: number; span: number } {
	if (min <= 0) return { low: 0, span: niceMax(max) };
	let span = niceMax(max - min);
	let low = Math.floor(min / (span / 4)) * (span / 4);
	// Rounding the bottom down can leave the top out of reach: use the next longer axis.
	while (low + span < max) {
		span = niceMax(max - low);
		low = Math.floor(min / (span / 4)) * (span / 4);
	}
	return { low, span };
}

/** Evenly spaced indices into a list of `n`, at most `count` of them. */
function tickIndices(n: number, count: number): number[] {
	if (n <= count) return Array.from({ length: n }, (_, i) => i);
	return Array.from({ length: count }, (_, i) =>
		Math.round((i * (n - 1)) / (count - 1)),
	);
}

/** Indices nearest to `count` evenly spaced moments, for points spread unevenly in time. */
function timeTickIndices(xs: number[], count: number): number[] {
	const first = xs[0] as number;
	const span = (xs[xs.length - 1] as number) - first;
	const out: number[] = [];
	for (let t = 0; t < count; t++) {
		const target = first + (span * t) / (count - 1);
		let best = 0;
		for (let i = 1; i < xs.length; i++)
			if (
				Math.abs((xs[i] as number) - target) <
				Math.abs((xs[best] as number) - target)
			)
				best = i;
		if (out[out.length - 1] !== best) out.push(best);
	}
	return out;
}

/** Rough width of an axis label in pixels (13px sans-serif, as `.chart-label`). */
const labelWidth = (text: string) => text.length * 7.2;
const LABEL_GAP = 10;

type XTick = { i: number; x: number; text: string; anchor: string };

/**
 * The ticks whose labels do not overlap: the first stays, then the last, and a middle one is
 * dropped when it would touch a neighbour.
 */
function spreadTicks(ticks: XTick[]): XTick[] {
	const extent = (t: XTick) => {
		const w = labelWidth(t.text);
		return t.anchor === "start"
			? [t.x, t.x + w]
			: t.anchor === "end"
				? [t.x - w, t.x]
				: [t.x - w / 2, t.x + w / 2];
	};
	const fits = (a: XTick, b: XTick) =>
		(extent(a)[1] as number) + LABEL_GAP <= (extent(b)[0] as number);
	const out: XTick[] = [];
	for (const t of ticks) {
		const prev = out[out.length - 1];
		if (!prev || fits(prev, t)) out.push(t);
	}
	const last = ticks[ticks.length - 1];
	if (last && out[out.length - 1] !== last) {
		while (out.length > 1 && !fits(out[out.length - 1] as XTick, last))
			out.pop();
		if (out.length === 0 || fits(out[out.length - 1] as XTick, last))
			out.push(last);
	}
	return out;
}

/**
 * A small chart: `steps` draws lines that hold their value between points (for readings taken
 * at moments), `bars` draws stacked bars, one per equally long period.
 */
export function Chart(props: {
	kind: "steps" | "bars";
	xs: number[];
	series: ChartSeries[];
	formatY: (value: number) => string;
	formatX: (x: number) => string;
	/** Fuller form of `formatX` for the tooltip (e.g. with the year); defaults to `formatX`. */
	formatTip?: (x: number) => string;
	/** Extra line in the tooltip for the point at this index. */
	note?: (index: number) => string | null;
	/** Accessible name of the chart (what it shows). Default "Chart". */
	ariaLabel?: string;
	/** For `steps`: start the value axis near the lowest value instead of at 0, so the lines fill the height. */
	fit?: boolean;
}) {
	const { kind, xs, series, formatY, formatX } = props;
	const [hover, setHover] = useState<number | null>(null);
	const boxRef = useRef<HTMLDivElement>(null);
	const [W, setW] = useState(DEFAULT_W);
	useEffect(() => {
		const el = boxRef.current;
		if (!el || typeof ResizeObserver === "undefined") return;
		const measure = () => {
			if (el.clientWidth > 0) setW(el.clientWidth);
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	const n = xs.length;
	if (n === 0) return <p class="muted">No data yet.</p>;

	const stacked = kind === "bars";
	const totals = xs.map((_, i) =>
		series.reduce((acc, s) => {
			const v = s.values[i] ?? 0;
			return stacked ? acc + v : Math.max(acc, v);
		}, 0),
	);
	const { low, span: yRange } = yAxis(
		totals.reduce((max, t) => Math.max(max, t), 0),
		props.fit && !stacked
			? Math.min(...series.flatMap((s) => xs.map((_, i) => s.values[i] ?? 0)))
			: 0,
	);
	const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => low + f * yRange);
	const left = Math.max(...yTicks.map((v) => labelWidth(formatY(v)))) + 12;
	const PLOT_W = Math.max(1, W - left - PAD.right);
	const y = (v: number) => PAD.top + PLOT_H * (1 - (v - low) / yRange);

	const first = xs[0] as number;
	const span = (xs[n - 1] as number) - first;
	const x = (i: number) =>
		kind === "bars"
			? left + (PLOT_W * (i + 0.5)) / n
			: left +
				(span > 0 ? (PLOT_W * ((xs[i] as number) - first)) / span : PLOT_W / 2);

	const pick = (e: PointerEvent) => {
		const box = (e.currentTarget as Element).getBoundingClientRect();
		const px = ((e.clientX - box.left) / box.width) * W;
		let best = 0;
		for (let i = 1; i < n; i++)
			if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
		setHover(best);
	};

	// Steps sit at their moment in time, so their ticks are spread by time rather than by index.
	const xTicks = spreadTicks(
		(kind === "steps" && span > 0
			? timeTickIndices(xs, 5)
			: tickIndices(n, 5)
		).map((i) => ({
			i,
			x: x(i),
			text: formatX(xs[i] as number),
			anchor:
				i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle",
		})),
	);
	const barW = Math.max(1, (PLOT_W / n) * 0.78);
	const hoverNote = hover === null ? null : (props.note?.(hover) ?? null);
	const hoverX = hover === null ? 0 : x(hover);

	return (
		<div class="chart">
			<div class="chart-box" ref={boxRef}>
				<svg
					viewBox={`0 0 ${W} ${H}`}
					class="chart-svg"
					role="img"
					aria-label={props.ariaLabel ?? "Chart"}
					onPointerMove={pick}
					onPointerLeave={() => setHover(null)}
				>
					{yTicks.map((v) => (
						<g key={v}>
							<line
								class="chart-grid"
								x1={left}
								x2={W - PAD.right}
								y1={y(v)}
								y2={y(v)}
							/>
							<text
								class="chart-label"
								x={left - 6}
								y={y(v) + 4}
								text-anchor="end"
							>
								{formatY(v)}
							</text>
						</g>
					))}
					{xTicks.map((t) => (
						<text
							key={t.i}
							class="chart-label"
							x={t.x}
							y={H - 6}
							text-anchor={t.anchor}
						>
							{t.text}
						</text>
					))}

					{kind === "bars"
						? xs.map((_, i) => {
								let base = 0;
								return (
									<g key={i}>
										{series.map((s) => {
											const v = s.values[i] ?? 0;
											const bottom = base;
											base += v;
											if (v <= 0) return null;
											return (
												<rect
													key={s.key}
													x={x(i) - barW / 2}
													width={barW}
													y={y(bottom + v)}
													height={Math.max(0.5, y(bottom) - y(bottom + v))}
													fill={s.color}
												/>
											);
										})}
									</g>
								);
							})
						: series.map((s) => {
								const pts = xs.map(
									(_, i) => [x(i), y(s.values[i] ?? 0)] as const,
								);
								let d = `M${pts[0]?.[0]} ${pts[0]?.[1]}`;
								for (let i = 1; i < pts.length; i++)
									d += ` H${pts[i]?.[0]} V${pts[i]?.[1]}`;
								if (n === 1) d += ` H${left + PLOT_W}`;
								return (
									<path
										key={s.key}
										d={d}
										fill="none"
										stroke={s.color}
										stroke-width="2"
										stroke-linejoin="round"
									/>
								);
							})}

					{hover !== null && (
						<line
							class="chart-cursor"
							x1={hoverX}
							x2={hoverX}
							y1={PAD.top}
							y2={PAD.top + PLOT_H}
						/>
					)}
				</svg>
				{hover !== null && (
					<div
						class="chart-tip"
						style={
							hoverX / W > 0.6
								? { right: `calc(${100 - (hoverX / W) * 100}% + 10px)` }
								: { left: `calc(${(hoverX / W) * 100}% + 10px)` }
						}
					>
						<div class="tip-title">
							{(props.formatTip ?? formatX)(xs[hover] as number)}
						</div>
						{series.map((s) => (
							<div key={s.key} class="chart-tip-row">
								<span class="chart-swatch" style={{ background: s.color }} />
								<span>{s.label}</span>
								<span class="chart-tip-value">
									{formatY(s.values[hover] ?? 0)}
								</span>
							</div>
						))}
						{hoverNote && <div class="muted hint">{hoverNote}</div>}
					</div>
				)}
			</div>
			<div class="chart-legend">
				{series.map((s) => (
					<span key={s.key}>
						<span class="chart-swatch" style={{ background: s.color }} />
						{s.label}
					</span>
				))}
			</div>
		</div>
	);
}
