import { afterEach, describe, expect, test } from "bun:test";
import { signal } from "@preact/signals";
import { render } from "preact";
import { act } from "preact/test-utils";
import { type AsyncOptions, type AsyncState, useAsync } from "./useAsync";
import { useDebounced } from "./useDebounced";
import { usePageOffset } from "./usePageOffset";

const host = document.createElement("div");
document.body.append(host);
afterEach(() => act(() => render(null, host)));

/** Waits for real time. Not inside act(): that holds back renders until it ends. */
const wait = async (ms: number) => {
	await new Promise<void>((r) => setTimeout(r, ms));
	await act(async () => {});
};

/** A promise that is settled from the test. */
function deferred<T>() {
	let resolve!: (v: T) => void;
	let reject!: (e: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function harness<T>(
	load: (n: number, signal: AbortSignal) => Promise<T>,
	opts: AsyncOptions = {},
) {
	const out: { state: AsyncState<T>; n: number } = {
		state: undefined as never,
		n: 0,
	};
	let setN: (n: number) => void = () => {};
	function C(props: { n: number; skip?: boolean }) {
		out.n = props.n;
		out.state = useAsync(
			props.skip ? null : (signal) => load(props.n, signal),
			[props.n],
			opts,
		);
		return null;
	}
	const draw = (n: number, skip = false) =>
		act(() => render(<C n={n} skip={skip} />, host));
	setN = (n) => draw(n);
	return { out, draw, setN };
}

describe("useAsync", () => {
	test("loads, then has data and no error", async () => {
		const d = deferred<string>();
		const h = harness(() => d.promise);
		h.draw(1);
		expect(h.out.state.loading).toBe(true);
		expect(h.out.state.data).toBeNull();
		await act(async () => d.resolve("hello"));
		expect(h.out.state).toMatchObject({
			data: "hello",
			error: null,
			loading: false,
		});
	});

	test("a failure becomes the error message and keeps old data", async () => {
		const calls: ReturnType<typeof deferred<string>>[] = [];
		const h = harness(() => {
			const d = deferred<string>();
			calls.push(d);
			return d.promise;
		});
		h.draw(1);
		await act(async () => calls[0]?.resolve("one"));
		h.draw(2);
		await act(async () => calls[1]?.reject(new Error("nope")));
		expect(h.out.state).toMatchObject({
			data: "one",
			error: "nope",
			loading: false,
		});
		h.out.state.reload();
		await act(async () => {});
		await act(async () => calls[2]?.resolve("two"));
		expect(h.out.state).toMatchObject({ data: "two", error: null });
	});

	test("keeps the old data while the next loads, and ignores a stale answer", async () => {
		const calls: ReturnType<typeof deferred<string>>[] = [];
		const signals: AbortSignal[] = [];
		const h = harness((_, signal) => {
			signals.push(signal);
			const d = deferred<string>();
			calls.push(d);
			return d.promise;
		});
		h.draw(1);
		await act(async () => calls[0]?.resolve("first"));
		h.draw(2);
		expect(h.out.state).toMatchObject({ data: "first", loading: true });
		h.draw(3);
		// The answer to the second request arrives after the third was asked for.
		expect(signals[1]?.aborted).toBe(true);
		await act(async () => calls[1]?.resolve("stale"));
		expect(h.out.state.data).toBe("first");
		await act(async () => calls[2]?.resolve("third"));
		expect(h.out.state).toMatchObject({ data: "third", loading: false });
	});

	test("null skips loading", async () => {
		let calls = 0;
		const h = harness(async () => {
			calls++;
			return 1;
		});
		h.draw(1, true);
		await wait(5);
		expect(calls).toBe(0);
		expect(h.out.state.loading).toBe(false);
		h.draw(1, false);
		await wait(5);
		expect(calls).toBe(1);
		expect(h.out.state.data).toBe(1);
	});

	test("polls", async () => {
		let calls = 0;
		const h = harness(
			async () => {
				return ++calls;
			},
			{ pollMs: 10 },
		);
		h.draw(1);
		await wait(55);
		expect(calls).toBeGreaterThanOrEqual(3);
		const seen = calls;
		act(() => render(null, host));
		await wait(30);
		expect(calls).toBe(seen);
	});

	test("reloads, after a pause, when the refresh signal changes (not at the start)", async () => {
		const rev = signal(0);
		let calls = 0;
		const h = harness(
			async () => {
				return ++calls;
			},
			{ refresh: rev, refreshDelayMs: 10 },
		);
		h.draw(1);
		await wait(20);
		expect(calls).toBe(1);
		rev.value = 1;
		rev.value = 2;
		await wait(5);
		expect(calls).toBe(1);
		await wait(30);
		expect(calls).toBe(2);
		expect(h.out.state.data).toBe(2);
	});
});

describe("useDebounced", () => {
	test("follows the value once it stops changing", async () => {
		let seen = "";
		function C(props: { v: string }) {
			seen = useDebounced(props.v, 15);
			return null;
		}
		act(() => render(<C v="a" />, host));
		expect(seen).toBe("a");
		act(() => render(<C v="b" />, host));
		act(() => render(<C v="c" />, host));
		expect(seen).toBe("a");
		await wait(40);
		expect(seen).toBe("c");
	});
});

describe("usePageOffset", () => {
	test("goes back to 0 when the key changes", () => {
		let offset = -1;
		let set: (o: number) => void = () => {};
		function C(props: { k: string }) {
			[offset, set] = usePageOffset(props.k);
			return null;
		}
		act(() => render(<C k="a" />, host));
		expect(offset).toBe(0);
		act(() => set(50));
		expect(offset).toBe(50);
		act(() => render(<C k="b" />, host));
		expect(offset).toBe(0);
		act(() => set(20));
		act(() => render(<C k="b" />, host));
		expect(offset).toBe(20);
	});
});
