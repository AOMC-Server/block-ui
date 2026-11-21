const AVATAR_COLORS = 8;

/** Which of the `--avatar-1..8` colours a name gets; the same name always gets the same one. */
export function avatarColorIndex(name: string): number {
	let h = 0;
	for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
	return (h % AVATAR_COLORS) + 1;
}

/**
 * A picture (`src`, drawn pixelated: skins) or the first letter of `name` on a colour picked from
 * the name. `round` makes it a circle.
 */
export function Avatar(props: {
	name: string;
	src?: string;
	size?: number;
	round?: boolean;
}) {
	const size = props.size ?? 24;
	const cls = `avatar ${props.round ? "round" : ""}`;
	if (props.src)
		return (
			<img
				class={cls}
				src={props.src}
				alt={props.name}
				width={size}
				height={size}
				style={{ "--avatar-size": `${size}px` }}
			/>
		);
	return (
		<span
			class={`${cls} initials`}
			style={{
				"--avatar-size": `${size}px`,
				background: `var(--avatar-${avatarColorIndex(props.name)})`,
			}}
			aria-hidden="true"
		>
			{(props.name[0] ?? "?").toUpperCase()}
		</span>
	);
}
