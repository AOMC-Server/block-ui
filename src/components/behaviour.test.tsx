import { afterEach, describe, expect, test } from "bun:test";
import type { ComponentChildren } from "preact";
import { render } from "preact";
import { useState } from "preact/hooks";
import { act } from "preact/test-utils";
import { startReorder } from "../lib/reorder";
import { Field } from "./Field";
import { Grip } from "./Grip";
import { Modal } from "./Modal";
import { Panel } from "./Panel";
import { Tabs } from "./Tabs";
import { clearToasts, dismissToast, Toasts, toast } from "./Toast";
import { initToggleDrag } from "./toggleDrag";

let host: HTMLElement | null = null;

function mount(ui: ComponentChildren) {
	host = document.createElement("div");
	document.body.append(host);
	act(() => render(ui, host as HTMLElement));
	return host;
}

afterEach(() => {
	clearToasts();
	if (host) {
		act(() => render(null, host as HTMLElement));
		host.remove();
		host = null;
	}
	document.body.innerHTML = "";
	document.body.className = "";
});

const q = <T extends Element = HTMLElement>(sel: string) =>
	document.querySelector(sel) as T;
const fire = (target: EventTarget, event: Event) =>
	act(() => {
		target.dispatchEvent(event);
	});
const pointer = (type: string, init: PointerEventInit = {}): PointerEvent =>
	new PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		button: 0,
		pointerId: 1,
		pointerType: "mouse",
		...init,
	});
const keydown = (target: EventTarget, key: string) => {
	const ev = new KeyboardEvent("keydown", {
		key,
		bubbles: true,
		cancelable: true,
	});
	fire(target, ev);
	return ev;
};

/** Pointer capture as a record of what was asked, per element. */
function trackCapture(el: HTMLElement) {
	const log: string[] = [];
	el.setPointerCapture = () => {
		log.push("set");
	};
	el.releasePointerCapture = () => {
		log.push("release");
	};
	return log;
}

describe("Escape during a list drag inside a Modal", () => {
	function Rows(props: { onDrop: (from: number, to: number) => void }) {
		return (
			<ul>
				{["a", "b", "c"].map((id, i) => (
					<li key={id}>
						<Grip
							id={id}
							label={id}
							index={i}
							count={3}
							onMove={props.onDrop}
						/>
					</li>
				))}
			</ul>
		);
	}

	test("cancels the drag and leaves the modal open; the next Escape closes it", () => {
		let closed = 0;
		const drops: [number, number][] = [];
		mount(
			<Modal title="List" onClose={() => closed++}>
				<Rows onDrop={(f, t) => drops.push([f, t])} />
			</Modal>,
		);
		const grip = q(".grip");
		const capture = trackCapture(grip);
		fire(grip, pointer("pointerdown", { clientY: 0 }));
		fire(grip, pointer("pointermove", { clientY: 30 }));
		const item = q("li");
		expect(item.classList.contains("dragging")).toBe(true);

		const ev = keydown(window, "Escape");
		expect(closed).toBe(0);
		expect(ev.defaultPrevented).toBe(true);
		expect(item.classList.contains("dragging")).toBe(false);
		expect(capture).toEqual(["set", "release"]);
		// The drag is over, so releasing the pointer drops nothing.
		fire(grip, pointer("pointerup", { clientY: 30 }));
		expect(drops).toEqual([]);

		keydown(window, "Escape");
		expect(closed).toBe(1);
	});

	test("without a drag, Escape closes the modal as before", () => {
		let closed = 0;
		mount(
			<Modal title="List" onClose={() => closed++}>
				<Rows onDrop={() => {}} />
			</Modal>,
		);
		keydown(window, "Escape");
		expect(closed).toBe(1);
	});

	test("a pointer that is no longer captured ends the drag", () => {
		const drops: [number, number][] = [];
		mount(<Rows onDrop={(f, t) => drops.push([f, t])} />);
		const grip = q(".grip");
		trackCapture(grip);
		fire(grip, pointer("pointerdown", { clientY: 0 }));
		fire(grip, pointer("pointermove", { clientY: 30 }));
		expect(q("li").classList.contains("dragging")).toBe(true);
		fire(grip, new Event("lostpointercapture"));
		expect(q("li").classList.contains("dragging")).toBe(false);
		fire(grip, pointer("pointerup", { clientY: 30 }));
		expect(drops).toEqual([]);
	});

	test("a row removed mid-drag does not leave the drag (and its Escape) behind", async () => {
		let closed = 0;
		mount(
			<Modal title="List" onClose={() => closed++}>
				<Rows onDrop={() => {}} />
			</Modal>,
		);
		const grip = q(".grip");
		trackCapture(grip);
		fire(grip, pointer("pointerdown", { clientY: 0 }));
		fire(grip, pointer("pointermove", { clientY: 30 }));
		q("ul").remove();
		await new Promise((r) => setTimeout(r, 60));
		keydown(window, "Escape");
		expect(closed).toBe(1);
	});

	test("releasing the pointer drops and releases the capture", () => {
		const li = document.createElement("li");
		const other = document.createElement("li");
		const handle = document.createElement("button");
		li.append(handle);
		const ul = document.createElement("ul");
		ul.append(li, other);
		document.body.append(ul);
		const capture = trackCapture(handle);
		const drops: [number, number][] = [];
		startReorder(pointer("pointerdown", { clientY: 0 }), handle, li, (f, t) =>
			drops.push([f, t]),
		);
		fire(handle, pointer("pointerup", { clientY: 0 }));
		expect(capture).toEqual(["set", "release"]);
		expect(drops).toEqual([]);
	});
});

describe("Grip", () => {
	function List(props: { ids: string[] }) {
		const [ids, setIds] = useState(props.ids);
		return (
			<ul>
				{ids.map((id, i) => (
					// A key per position: the rows are re-created when they move.
					<li key={`${id}@${i}`}>
						<Grip
							id={id}
							label={id}
							index={i}
							count={ids.length}
							onMove={(from, to) => {
								const next = [...ids];
								const [moved] = next.splice(from, 1);
								next.splice(to, 0, moved as string);
								setIds(next);
							}}
						/>
					</li>
				))}
			</ul>
		);
	}

	test("the keyboard stays on the row after it moved, even when it was re-created", () => {
		mount(<List ids={["a", "b", "c"]} />);
		const first = q<HTMLButtonElement>(".grip");
		first.focus();
		expect(document.activeElement).toBe(first);
		keydown(first, "ArrowDown");
		const grips = [...document.querySelectorAll<HTMLElement>(".grip")];
		expect(grips.map((g) => g.dataset.grip)).toEqual(["b", "a", "c"]);
		expect(document.activeElement).toBe(grips[1] as HTMLElement);
		keydown(document.activeElement as HTMLElement, "ArrowDown");
		expect(document.activeElement).toBe(
			document.querySelectorAll<HTMLElement>(".grip")[2] as HTMLElement,
		);
	});

	test("an id with quotes and brackets is no problem", () => {
		mount(<List ids={['a"]b', "c\\d"]} />);
		const first = q<HTMLButtonElement>(".grip");
		first.focus();
		keydown(first, "ArrowDown");
		const grips = [...document.querySelectorAll<HTMLElement>(".grip")];
		expect(grips.map((g) => g.dataset.grip)).toEqual(["c\\d", 'a"]b']);
		expect(document.activeElement).toBe(grips[1] as HTMLElement);
	});
});

describe("Toasts", () => {
	test("the stack is not a live region; each toast announces itself", () => {
		mount(<Toasts />);
		act(() => {
			toast("fine", "ok");
			toast("bad", "error");
		});
		expect(q(".toasts").hasAttribute("aria-live")).toBe(false);
		expect(
			[...document.querySelectorAll(".toast")].map((t) =>
				t.getAttribute("role"),
			),
		).toEqual(["status", "alert"]);
	});

	test("dismissing a toast clears its timer", () => {
		const realSet = globalThis.setTimeout;
		const realClear = globalThis.clearTimeout;
		const started: unknown[] = [];
		const cleared: unknown[] = [];
		globalThis.setTimeout = ((fn: () => void, ms?: number, ...rest: []) => {
			const handle = realSet(fn, ms, ...rest);
			if (ms === 4321) started.push(handle);
			return handle;
		}) as unknown as typeof setTimeout;
		globalThis.clearTimeout = ((handle: Parameters<typeof clearTimeout>[0]) => {
			cleared.push(handle);
			realClear(handle);
		}) as typeof clearTimeout;
		try {
			mount(<Toasts />);
			let id = 0;
			act(() => {
				id = toast("soon gone", "info", 4321);
			});
			expect(started).toHaveLength(1);
			act(() => dismissToast(id));
			expect(cleared).toContain(started[0]);
			expect(document.querySelectorAll(".toast")).toHaveLength(0);
		} finally {
			globalThis.setTimeout = realSet;
			globalThis.clearTimeout = realClear;
		}
	});
});

describe("Tabs", () => {
	const three = [
		{ id: "a", label: "A" },
		{ id: "b", label: "B" },
		{ id: "c", label: "C" },
	] as const;

	test("buttons form a tab list: roving tabindex, arrows select and move focus", () => {
		const log: string[] = [];
		function Harness() {
			const [value, setValue] = useState<"a" | "b" | "c">("a");
			return (
				<Tabs
					tabs={three}
					value={value}
					label="Sections"
					onChange={(id) => {
						log.push(id);
						setValue(id);
					}}
				/>
			);
		}
		mount(<Harness />);
		const tabs = () => [
			...document.querySelectorAll<HTMLElement>("[role=tab]"),
		];
		expect(q(".tabs").getAttribute("role")).toBe("tablist");
		expect(q(".tabs").getAttribute("aria-label")).toBe("Sections");
		expect(tabs().map((t) => t.getAttribute("tabindex"))).toEqual([
			"0",
			"-1",
			"-1",
		]);
		(tabs()[0] as HTMLElement).focus();
		keydown(document.activeElement as HTMLElement, "ArrowRight");
		expect(log).toEqual(["b"]);
		expect(document.activeElement).toBe(tabs()[1] as HTMLElement);
		expect(tabs().map((t) => t.getAttribute("tabindex"))).toEqual([
			"-1",
			"0",
			"-1",
		]);
		expect(tabs().map((t) => t.getAttribute("aria-selected"))).toEqual([
			"false",
			"true",
			"false",
		]);
		keydown(document.activeElement as HTMLElement, "End");
		expect(document.activeElement).toBe(tabs()[2] as HTMLElement);
		keydown(document.activeElement as HTMLElement, "ArrowRight");
		expect(document.activeElement).toBe(tabs()[0] as HTMLElement);
		keydown(document.activeElement as HTMLElement, "ArrowLeft");
		expect(document.activeElement).toBe(tabs()[2] as HTMLElement);
		expect(log).toEqual(["b", "c", "a", "c"]);
	});

	test("links form a nav with aria-current, and no tab roles", () => {
		mount(
			<Tabs
				tabs={[
					{ id: "a", label: "A", href: "/a" },
					{ id: "b", label: "B", href: "/b" },
				]}
				value="b"
				label="Pages"
			/>,
		);
		const nav = q(".tabs");
		expect(nav.tagName).toBe("NAV");
		expect(nav.getAttribute("aria-label")).toBe("Pages");
		expect(nav.hasAttribute("role")).toBe(false);
		expect(document.querySelectorAll("[role]")).toHaveLength(0);
		const links = [...document.querySelectorAll("a.tab")];
		expect(links.map((a) => a.getAttribute("aria-current"))).toEqual([
			null,
			"page",
		]);
		expect(links.map((a) => a.hasAttribute("tabindex"))).toEqual([
			false,
			false,
		]);
	});
});

describe("Field", () => {
	test("the hint is outside the label and describes the control", () => {
		mount(
			<Field label="Name" hint="Shown to everyone">
				<input type="text" />
			</Field>,
		);
		const input = q<HTMLInputElement>("input");
		const hint = q(".hint");
		expect(input.closest("label")?.textContent).toBe("Name");
		expect(hint.closest("label")).toBeNull();
		expect(hint.id).not.toBe("");
		expect(input.getAttribute("aria-describedby")).toBe(hint.id);
	});

	test("two fields have their own hints; other descriptions stay", () => {
		mount(
			<>
				<Field label="A" hint="one">
					<input aria-describedby="other" />
				</Field>
				<Field label="B" hint="two">
					<select />
				</Field>
			</>,
		);
		const [one, two] = [...document.querySelectorAll(".hint")];
		const [input, select] = [q("input"), q("select")];
		expect(input.getAttribute("aria-describedby")).toBe(`other ${one?.id}`);
		expect(select.getAttribute("aria-describedby")).toBe(two?.id as string);
		expect(one?.id).not.toBe(two?.id);
	});

	test("a hint that comes and goes is linked and unlinked", () => {
		const ui = (hint?: string) => (
			<Field label="A" hint={hint}>
				<input />
			</Field>
		);
		mount(ui());
		expect(q("input").hasAttribute("aria-describedby")).toBe(false);
		act(() => render(ui("now there is one"), host as HTMLElement));
		expect(q("input").getAttribute("aria-describedby")).toBe(q(".hint").id);
		act(() => render(ui(), host as HTMLElement));
		expect(q("input").hasAttribute("aria-describedby")).toBe(false);
	});
});

describe("Panel resize handle", () => {
	function setup() {
		const changes: [number, boolean][] = [];
		mount(
			<Panel
				title="P"
				onClose={() => {}}
				resize={{
					width: 400,
					min: 320,
					max: 700,
					onChange: (w, commit) => changes.push([w, commit]),
					onReset: () => {},
				}}
			>
				x
			</Panel>,
		);
		const handle = q(".panel-resize");
		(handle.parentElement as HTMLElement).getBoundingClientRect = () =>
			({ left: 800, right: 1200, top: 0, bottom: 0 }) as DOMRect;
		return { handle, changes, capture: trackCapture(handle) };
	}

	test("drags with pointer capture on the handle, and commits when released", () => {
		const { handle, changes, capture } = setup();
		fire(handle, pointer("pointerdown", { clientX: 800 }));
		expect(capture).toEqual(["set"]);
		expect(document.body.classList.contains("resizing")).toBe(true);
		fire(handle, pointer("pointermove", { clientX: 700 }));
		// The panel's right edge is at 1200: the width is 1200 - 700.
		fire(handle, pointer("pointermove", { clientX: 100 }));
		fire(handle, pointer("pointerup", { clientX: 100 }));
		expect(changes).toEqual([
			[500, false],
			[700, false],
			[700, true],
		]);
		expect(document.body.classList.contains("resizing")).toBe(false);
		// Once over, moving does nothing; losing the capture afterwards does not commit twice.
		fire(handle, pointer("pointermove", { clientX: 900 }));
		fire(handle, new Event("lostpointercapture"));
		expect(changes).toHaveLength(3);
	});

	test("losing the capture ends the drag", () => {
		const { handle, changes } = setup();
		fire(handle, pointer("pointerdown", { clientX: 800 }));
		fire(handle, pointer("pointermove", { clientX: 600 }));
		fire(handle, new Event("lostpointercapture"));
		expect(changes.at(-1)).toEqual([600, true]);
		expect(document.body.classList.contains("resizing")).toBe(false);
	});

	test("unmounting during a drag clears body.resizing", () => {
		const { handle } = setup();
		fire(handle, pointer("pointerdown", { clientX: 800 }));
		expect(document.body.classList.contains("resizing")).toBe(true);
		act(() => render(null, host as HTMLElement));
		expect(document.body.classList.contains("resizing")).toBe(false);
	});
});

describe("toggle drag", () => {
	function setup() {
		const clicks: string[] = [];
		mount(
			<>
				<input type="checkbox" class="switch" />
				<button type="button" onClick={() => clicks.push("button")} />
			</>,
		);
		const input = q<HTMLInputElement>("input.switch");
		input.getBoundingClientRect = () => ({ width: 48 }) as DOMRect;
		input.setPointerCapture = () => {};
		input.addEventListener("click", () => clicks.push("input"));
		const off = initToggleDrag();
		const drag = () => {
			fire(input, pointer("pointerdown", { clientX: 0 }));
			fire(input, pointer("pointermove", { clientX: 40 }));
			fire(input, pointer("pointerup", { clientX: 40 }));
		};
		return { input, clicks, off, drag };
	}

	test("the click after a drag is swallowed", () => {
		const { input, clicks, off, drag } = setup();
		drag();
		expect(input.checked).toBe(true);
		fire(input, new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(clicks).toEqual([]);
		off();
	});

	test("a click that never comes is not held back for the next press", () => {
		const { clicks, off, drag } = setup();
		drag();
		const button = q("button");
		fire(button, pointer("pointerdown"));
		fire(button, new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(clicks).toEqual(["button"]);
		off();
	});
});
