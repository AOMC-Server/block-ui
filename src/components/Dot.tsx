/** A small coloured square (a series, a server), optionally followed by its label. */
export function Dot(props: {
	/** Any CSS colour. */
	color: string;
	label?: string;
	/** Tooltip; defaults to the label. */
	title?: string;
	size?: number;
}) {
	const size = props.size;
	return (
		<span class="dot-wrap" title={props.title ?? props.label}>
			<span
				class="dot"
				style={{
					background: props.color,
					...(size ? { width: `${size}px`, height: `${size}px` } : {}),
				}}
			/>
			{props.label && <span>{props.label}</span>}
		</span>
	);
}
