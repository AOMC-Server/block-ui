import type { ComponentChildren } from "preact";
import { cx } from "../lib/cx";

/** A raised surface with an optional title bar (title and actions). `inner` for a card inside another surface. */
export function Card(props: {
	title?: ComponentChildren;
	actions?: ComponentChildren;
	footer?: ComponentChildren;
	inner?: boolean;
	class?: string;
	children: ComponentChildren;
}) {
	return (
		<section class={cx("card", props.inner && "inner", props.class)}>
			{(props.title || props.actions) && (
				<div class="card-head">
					<h2>{props.title}</h2>
					{props.actions && <div class="page-actions">{props.actions}</div>}
				</div>
			)}
			{props.children}
			{props.footer && <div class="card-foot">{props.footer}</div>}
		</section>
	);
}

/** A number with its label (and a hint); put them in a TileGrid. */
export function Tile(props: {
	label: string;
	value: ComponentChildren;
	hint?: string;
}) {
	return (
		<div class="tile">
			<div class="tile-label">{props.label}</div>
			<div class="tile-value">{props.value}</div>
			{props.hint && <div class="tile-hint">{props.hint}</div>}
		</div>
	);
}

export type TileData = {
	label: string;
	value: ComponentChildren;
	hint?: string;
};

/**
 * Tiles in a responsive grid. `plain` draws them flat, with bold labels and a wider grid, to sit
 * on a page section; `min` sets the narrowest a tile gets, in pixels (default 180, plain 200).
 */
export function TileGrid(props: {
	tiles: readonly TileData[];
	plain?: boolean;
	min?: number;
}) {
	return (
		<div
			class={cx("tiles", props.plain && "plain")}
			style={props.min ? { "--tile-min": `${props.min}px` } : undefined}
		>
			{props.tiles.map((t) => (
				<Tile key={t.label} {...t} />
			))}
		</div>
	);
}
