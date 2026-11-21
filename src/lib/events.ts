/**
 * One server-sent event stream shared by everything that follows live updates, generic over the
 * app's events: describe them as a map from family to the data of its events, and a topic is a
 * family, or a family and a key (`revision:12`).
 *
 *     type Events = { map: MapEvent; revision: RevisionEvent };
 *     const stream = createEventStream<Events>({ url: "/api/events" });
 *     stream.subscribe("revision:12", { onEvent: (data) => ... });   // data: RevisionEvent
 *
 * The server side is yours; this is the wire format it has to speak:
 * `GET {url}?topics=a,b:1` streams JSON `Envelope`s as default (`message`) events.
 */

/** Family -> the data its events carry. */
export type EventMap = Record<string, unknown>;

/** A family, or a family and a key: "map", "revision:7". */
export type Topic<M extends EventMap = EventMap> =
	| (keyof M & string)
	| `${keyof M & string}:${string}`;

/** What the events of a topic carry. */
export type DataOf<
	M extends EventMap,
	T extends string,
> = T extends `${infer F}:${string}`
	? F extends keyof M
		? M[F]
		: unknown
	: T extends keyof M
		? M[T]
		: unknown;

/** Why the server will not stream a topic. */
export type StreamError = "not found" | "forbidden" | "unknown topic";

/**
 * One message on the wire. `seq` counts the topic's events since the server started; a
 * `snapshot` is the current state sent when you subscribe (or a refresh of it), and carries the
 * seq of the topic's last event so a reconnect can tell whether it missed any. `final` marks the
 * last event of a topic that is done.
 */
export type Envelope<M extends EventMap = EventMap> =
	| {
			topic: Topic<M>;
			seq: string;
			snapshot: boolean;
			final?: true;
			data: M[keyof M];
	  }
	| { topic: string; error: StreamError };

export type Subscription<M extends EventMap, T extends Topic<M>> = {
	/** Each event of the topic. `snapshot` = its current state, sent on (re)connecting. */
	onEvent: (data: DataOf<M, T>, meta: { snapshot: boolean }) => void;
	/** The server will not stream it (unknown, not found, or not yours to follow); it is dropped. */
	onError?: (error: StreamError) => void;
	/**
	 * Called while the stream is down (right away, then every `pollMs`), so the subscriber can
	 * poll instead. It stops once the stream works again.
	 */
	poll?: () => void;
	pollMs?: number;
};

export type StreamStatus = "live" | "down";

type Source = Pick<EventSource, "close" | "onmessage" | "onerror" | "onopen">;

export type StreamOptions = {
	/** The endpoint, default "/api/events"; `?topics=...` is added to it. */
	url?: string;
	/** Opens the stream; replaceable for tests. */
	open?: (url: string) => Source;
	/** How long to wait to batch subscriptions into one connection. */
	batchMs?: number;
	/** Without a first event this long after connecting, a proxy is probably buffering. */
	silenceMs?: number;
	retryMs?: (attempt: number) => number;
	/** Called whenever the stream becomes live or goes down (see also `onStatus` of the stream). */
	onStatus?: (status: StreamStatus) => void;
};

const DEFAULT_POLL_MS = 30_000;

export function createEventStream<M extends EventMap = EventMap>(
	opts: StreamOptions = {},
) {
	type Sub = Subscription<M, Topic<M>>;
	const base = opts.url ?? "/api/events";
	const open = opts.open ?? ((url: string) => new EventSource(url));
	const batchMs = opts.batchMs ?? 30;
	const silenceMs = opts.silenceMs ?? 10_000;
	const retryMs =
		opts.retryMs ?? ((n: number) => Math.min(1000 * 2 ** n, 30_000));

	const subs = new Map<string, Set<Sub>>();
	/** The last event delivered per topic, to tell a repeated snapshot apart. */
	const last = new Map<string, { seq: string; json: string }>();
	/** Subscribers that have been given an event, so a late one still gets a snapshot that repeats. */
	const seen = new WeakSet<object>();
	const statusListeners = new Set<(status: StreamStatus) => void>();
	let source: Source | null = null;
	/** The topics the open stream was asked for. */
	let streaming = new Set<string>();
	let healthy = false;
	/** The stream broke and has not delivered anything since. */
	let isDown = false;
	let attempt = 0;
	let connectTimer: ReturnType<typeof setTimeout> | undefined;
	let silenceTimer: ReturnType<typeof setTimeout> | undefined;
	let pollTimers = new Map<Sub, ReturnType<typeof setInterval>>();

	const emitStatus = (status: StreamStatus) => {
		opts.onStatus?.(status);
		for (const fn of [...statusListeners]) fn(status);
	};

	const stopPolling = () => {
		for (const timer of pollTimers.values()) clearInterval(timer);
		pollTimers = new Map();
	};
	const startPolling = (sub: Sub) => {
		if (!sub.poll || pollTimers.has(sub)) return;
		sub.poll();
		pollTimers.set(
			sub,
			setInterval(() => sub.poll?.(), sub.pollMs ?? DEFAULT_POLL_MS),
		);
	};
	const down = () => {
		healthy = false;
		isDown = true;
		emitStatus("down");
		for (const set of subs.values()) for (const sub of set) startPolling(sub);
	};

	const close = () => {
		clearTimeout(silenceTimer);
		source?.close();
		source = null;
		streaming = new Set();
	};

	const connect = () => {
		clearTimeout(connectTimer);
		close();
		const topics = [...subs.keys()].sort();
		if (topics.length === 0) {
			stopPolling();
			return;
		}
		streaming = new Set(topics);
		const sep = base.includes("?") ? "&" : "?";
		const s = open(`${base}${sep}topics=${topics.join(",")}`);
		source = s;
		silenceTimer = setTimeout(() => {
			if (source === s) fail();
		}, silenceMs);
		s.onmessage = (e: MessageEvent) => {
			if (source !== s) return;
			clearTimeout(silenceTimer);
			if (!healthy) {
				healthy = true;
				isDown = false;
				attempt = 0;
				stopPolling();
				emitStatus("live");
			}
			receive(JSON.parse(e.data) as Envelope<M>);
		};
		s.onerror = () => {
			if (source === s) fail();
		};
	};

	/** The stream broke (or ended because every topic in it finished): poll, and try again. */
	const fail = () => {
		close();
		if (subs.size === 0) return;
		down();
		clearTimeout(connectTimer);
		connectTimer = setTimeout(connect, retryMs(attempt++));
	};

	/** The server no longer streams the topic: forget it and its subscribers. */
	const forget = (topic: string) => {
		const set = subs.get(topic);
		subs.delete(topic);
		last.delete(topic);
		// The stream no longer carries it, so following it again needs a new connection.
		streaming.delete(topic);
		for (const sub of set ?? []) {
			clearInterval(pollTimers.get(sub));
			pollTimers.delete(sub);
		}
		return set;
	};

	const receive = (envelope: Envelope<M>) => {
		if ("error" in envelope) {
			for (const sub of forget(envelope.topic) ?? [])
				sub.onError?.(envelope.error);
			return;
		}
		const set = subs.get(envelope.topic);
		// Nobody follows it any more (the stream may still carry it until the next connection).
		if (!set) return;
		const json = JSON.stringify(envelope.data);
		const prev = last.get(envelope.topic);
		const repeat =
			envelope.snapshot && prev?.seq === envelope.seq && prev.json === json;
		// A repeated snapshot is only news to a subscriber that joined after the original.
		const targets = [...set].filter((sub) => !repeat || !seen.has(sub));
		last.set(envelope.topic, { seq: envelope.seq, json });
		if (envelope.final) forget(envelope.topic);
		for (const sub of targets) {
			seen.add(sub);
			sub.onEvent(envelope.data as never, { snapshot: envelope.snapshot });
		}
	};

	const schedule = () => {
		clearTimeout(connectTimer);
		connectTimer = setTimeout(connect, batchMs);
	};

	return {
		/** Follows a topic. Returns a function that stops following it. */
		subscribe<T extends Topic<M>>(
			topic: T,
			subscription: Subscription<M, T>,
		): () => void {
			const sub = subscription as unknown as Sub;
			const set = subs.get(topic) ?? new Set<Sub>();
			subs.set(topic, set);
			set.add(sub);
			const known = last.get(topic);
			if (streaming.has(topic) && healthy && known) {
				// Already streaming: the new subscriber starts from the last event.
				queueMicrotask(() => {
					if (!set.has(sub)) return;
					seen.add(sub);
					sub.onEvent(JSON.parse(known.json), { snapshot: true });
				});
			} else if (!streaming.has(topic)) {
				schedule();
			}
			if (isDown) startPolling(sub);
			return () => {
				set.delete(sub);
				clearInterval(pollTimers.get(sub));
				pollTimers.delete(sub);
				// A topic that ended may have been followed again since, with a set of its own.
				if (set.size > 0 || subs.get(topic) !== set) return;
				subs.delete(topic);
				last.delete(topic);
				// Following it again needs a new snapshot, so a new connection.
				streaming.delete(topic);
				// Nothing left to follow: hang up. Otherwise the stream may carry an extra topic
				// until the next one is added.
				if (subs.size === 0) {
					clearTimeout(connectTimer);
					close();
					stopPolling();
					healthy = false;
					isDown = false;
				}
			};
		},
		/** Calls `fn` whenever the stream becomes live or goes down. Returns a function that stops it. */
		onStatus(fn: (status: StreamStatus) => void): () => void {
			statusListeners.add(fn);
			return () => {
				statusListeners.delete(fn);
			};
		},
		/** Whether the stream delivers events right now. */
		get healthy() {
			return healthy;
		},
	};
}

export type EventStream<M extends EventMap = EventMap> = ReturnType<
	typeof createEventStream<M>
>;

/**
 * An untyped stream on the default url, for apps that do not need their own. Apps with an event
 * map create theirs with `createEventStream<Events>()` and export its `subscribe`/`onStatus`.
 */
export const events = createEventStream();

/** Follows a topic on the shared stream. Returns a function that stops following it. */
export const subscribe = events.subscribe;

/** Calls `fn` whenever the shared stream becomes live or goes down. */
export const onConnection = events.onStatus;
