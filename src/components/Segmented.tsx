import { cx } from "../lib/cx";

/**
 * A tray of buttons that picks one of a few values (a time range, a view). `names` gives the
 * label of each option (default: the option itself).
 */
export function Segmented<T extends string>(props: {
	value: T;
	options: readonly T[];
	names?: Partial<Record<T, string>>;
	onChange: (value: T) => void;
	/** Accessible name of the group; drawn nowhere. */
	label: string;
	small?: boolean;
}) {
	return (
		<fieldset class="segmented-set">
			<legend class="visually-hidden">{props.label}</legend>
			<div class="segmented">
				{props.options.map((o) => (
					<button
						key={o}
						type="button"
						class={cx(
							"btn",
							props.small && "small",
							o === props.value && "active",
						)}
						aria-pressed={o === props.value}
						onClick={() => props.onChange(o)}
					>
						{props.names?.[o] ?? o}
					</button>
				))}
			</div>
		</fieldset>
	);
}
