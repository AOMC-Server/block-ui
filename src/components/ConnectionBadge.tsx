export type ConnectionStatus = "live" | "down" | "connecting";

const LABELS: Record<ConnectionStatus, string> = {
	live: "Live",
	down: "Reconnecting…",
	connecting: "Connecting…",
};

const TITLES: Record<ConnectionStatus, string> = {
	live: "Updates arrive as they happen.",
	down: "Not connected to the live stream; refreshing every few seconds instead.",
	connecting: "Connecting to the live stream…",
};

/** The state of a live stream (see createEventStream) as a dot and a word. */
export function ConnectionBadge(props: {
	status: ConnectionStatus;
	/** Replace the words (translations). */
	labels?: Partial<Record<ConnectionStatus, string>>;
	title?: string;
}) {
	const s = props.status;
	return (
		<span
			class={`conn conn-${s}`}
			title={props.title ?? TITLES[s]}
			role="status"
		>
			<span class="conn-dot" /> {props.labels?.[s] ?? LABELS[s]}
		</span>
	);
}
