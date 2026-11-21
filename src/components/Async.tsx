import type { ComponentChildren } from "preact";
import type { AsyncState } from "../hooks/useAsync";

export function Loading(props: { children?: ComponentChildren }) {
	return (
		<p class="muted state" role="status">
			{props.children ?? "Loading…"}
		</p>
	);
}

export function Empty(props: { children?: ComponentChildren }) {
	return <p class="muted state">{props.children ?? "Nothing here yet."}</p>;
}

export function ErrorBox(props: { message: string; onRetry?: () => void }) {
	return (
		<div class="error-box" role="alert">
			<span>{props.message}</span>
			{props.onRetry && (
				<button type="button" class="btn small" onClick={props.onRetry}>
					Retry
				</button>
			)}
		</div>
	);
}

/**
 * Standard rendering of a load's states (see useAsync): the error with a retry, or "Loading…",
 * until there is data; then `children(data)`, dimmed while it reloads, with an error above it if
 * a reload failed.
 */
export function Async<T>(props: {
	state: AsyncState<T>;
	children: (data: T) => ComponentChildren;
	/** Shown instead of "Loading…". */
	loading?: ComponentChildren;
}) {
	const { data, error, loading, reload } = props.state;
	if (data === null) {
		if (error) return <ErrorBox message={error} onRetry={reload} />;
		return <Loading>{props.loading}</Loading>;
	}
	return (
		<div class={loading ? "fade" : undefined}>
			{error && <ErrorBox message={error} onRetry={reload} />}
			{props.children(data)}
		</div>
	);
}
