import type { ComponentChildren } from "preact";
import { useId } from "preact/hooks";
import {
	MODES,
	type ModeChoice,
	paletteScope,
	STYLES,
	type StyleId,
} from "../theme/theme";

/**
 * A labelled row of buttons that picks one of a few values (a settings page: camera speed, units).
 * Unlike `Segmented`, the label is drawn, and a `hint` can follow the buttons.
 */
export function ChoicePicker<T extends string>(props: {
	label: string;
	value: T;
	options: readonly { readonly id: T; readonly name: string }[];
	onChange: (value: T) => void;
	hint?: ComponentChildren;
	/** At most 420px wide, instead of the whole row (a picker with few short options in a card). */
	narrow?: boolean;
	class?: string;
}) {
	return (
		<fieldset
			class={`mode-picker ${props.narrow ? "narrow" : ""} ${props.class ?? ""}`}
		>
			<legend class="label">{props.label}</legend>
			<div class="segmented">
				{props.options.map((o) => (
					<button
						key={o.id}
						type="button"
						class={`btn ${o.id === props.value ? "active" : ""}`}
						aria-pressed={o.id === props.value}
						onClick={() => props.onChange(o.id)}
					>
						{o.name}
					</button>
				))}
			</div>
			{props.hint && <span class="muted hint">{props.hint}</span>}
		</fieldset>
	);
}

/** System, Dark or Light: the colour mode (see `MODES`, `resolveMode`). */
export function ModePicker(props: {
	value: ModeChoice;
	onChange: (mode: ModeChoice) => void;
	/** Default "Colours". */
	label?: string;
	narrow?: boolean;
	class?: string;
}) {
	return (
		<ChoicePicker
			label={props.label ?? "Colours"}
			value={props.value}
			options={MODES}
			onChange={props.onChange}
			narrow={props.narrow}
			class={props.class}
		/>
	);
}

/**
 * A card per style (Bedrock, Windows 98, XP, Modern), each with a small window drawn in that
 * style, so the choice is seen rather than described. The previews take the mode and palette of
 * the page; `palette` gives them one of their own (an app's dimension or theme palette).
 */
export function StylePicker(props: {
	value: StyleId;
	onChange: (style: StyleId) => void;
	/** Default "Style". */
	label?: string;
	/** The title bar of the drawn window (default "Window"). */
	previewTitle?: string;
	/** The two buttons of the drawn window, the second one primary (default Cancel, OK). */
	previewButtons?: readonly [string, string];
	/** Draw the previews in this palette instead of the page's (see `paletteScope`). */
	palette?: string | null;
	class?: string;
}) {
	const name = useId();
	const [first, second] = props.previewButtons ?? ["Cancel", "OK"];
	const scope = paletteScope(props.palette);
	return (
		<fieldset class={`style-picker ${props.class ?? ""}`}>
			<legend class="label">{props.label ?? "Style"}</legend>
			{STYLES.map((st) => (
				<label
					key={st.id}
					class={`style-option ${st.id === props.value ? "selected" : ""}`}
				>
					<input
						class="visually-hidden"
						type="radio"
						name={name}
						value={st.id}
						checked={st.id === props.value}
						onChange={() => props.onChange(st.id)}
					/>
					<span
						class="style-preview"
						{...scope}
						data-style={st.id}
						aria-hidden="true"
					>
						<span class="preview-window">
							<span class="preview-head">{props.previewTitle ?? "Window"}</span>
							<span class="preview-body">
								<span class="btn small">{first}</span>
								<span class="btn small primary">{second}</span>
							</span>
						</span>
					</span>
					<span class="style-name">{st.name}</span>
					<span class="muted hint">{st.hint}</span>
				</label>
			))}
		</fieldset>
	);
}
