import type { ComponentChildren } from "preact";
import { cx } from "../lib/cx";

/**
 * A progress bar. `value` is the fraction done (0 to 1); leave it out for an animated bar when
 * the progress is not known. `label` (what it is doing) goes under the bar.
 */
export function Progress(props: {
	value?: number | null;
	label?: ComponentChildren;
	/** Accessible name of the bar when there is no visible label. */
	ariaLabel?: string;
}) {
	const known = typeof props.value === "number" && Number.isFinite(props.value);
	const pct = known
		? Math.round(Math.min(1, Math.max(0, props.value ?? 0)) * 100)
		: 0;
	const bar = (
		<div
			class="progress"
			role="progressbar"
			aria-label={props.ariaLabel}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={known ? pct : undefined}
		>
			<div
				class={cx("bar", !known && "indeterminate")}
				style={known ? { width: `${pct}%` } : undefined}
			/>
		</div>
	);
	if (!props.label) return bar;
	return (
		<div class="progress-wrap">
			{bar}
			<div class="muted small-text">{props.label}</div>
		</div>
	);
}

export type BossBarColor = "yellow" | "purple" | "maintenance";

/**
 * A banner with a title, a bar and an optional action, for a state that lasts (maintenance,
 * looking at the past). `fill` is the fraction of the bar (0 to 1). Stack several in
 * `.bossbar-wrap` and position that from the app.
 */
export function BossBar(props: {
	title: ComponentChildren;
	fill: number;
	color: BossBarColor;
	action?: string;
	onAction?: () => void;
}) {
	return (
		<div class={cx("bossbar", props.color)} role="status">
			<div class="bossbar-main">
				<div class="bossbar-title">{props.title}</div>
				<div class={cx("bossbar-track", props.color)}>
					<span
						style={{
							width: `${Math.round(Math.min(1, Math.max(0, props.fill)) * 100)}%`,
						}}
					/>
				</div>
			</div>
			{props.action && (
				<button type="button" class="btn small" onClick={props.onAction}>
					{props.action}
				</button>
			)}
		</div>
	);
}
