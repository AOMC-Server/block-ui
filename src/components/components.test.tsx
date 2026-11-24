import { afterEach, describe, expect, test } from "bun:test";
import type { ComponentChildren } from "preact";
import { render } from "preact";
import { act } from "preact/test-utils";
import type { AsyncState } from "../hooks/useAsync";
import { moveFocus } from "../lib/menu";
import { appearance } from "../theme/theme";
import { Async, Empty, ErrorBox, Loading } from "./Async";
import { Avatar } from "./Avatar";
import { Badge, Count } from "./Badge";
import { Card, Tile, TileGrid } from "./Card";
import { Chart } from "./Chart";
import { ConnectionBadge } from "./ConnectionBadge";
import { Dot } from "./Dot";
import { Field } from "./Field";
import { Grip } from "./Grip";
import { Confirm, Modal } from "./Modal";
import { Page } from "./Page";
import { Panel } from "./Panel";
import { ChoicePicker, ModePicker, StylePicker } from "./Pickers";
import { PopupText } from "./PopupText";
import { PreviewSelect } from "./PreviewSelect";
import { BossBar, Progress } from "./Progress";
import { Segmented } from "./Segmented";
import { copyText, ExpirySelect, ShownOnce } from "./share";
import { Pager, SortTh } from "./Table";
import { Tabs } from "./Tabs";
import { clearToasts, dismissToast, Toasts, toast } from "./Toast";
import { Toggle } from "./Toggle";

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
});

const q = <T extends Element = HTMLElement>(sel: string) =>
	document.querySelector(sel) as T;
const click = (el: Element) =>
	act(() => {
		el.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
	});
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
	act(() => {
		el.dispatchEvent(
			new KeyboardEvent("keydown", {
				key: k,
				bubbles: true,
				cancelable: true,
				...init,
			}),
		);
	});

describe("Modal", () => {
	test("renders a labelled dialog with a title, body and footer", () => {
		mount(
			<Modal title="Hello" onClose={() => {}} wide footer={<b id="f">ok</b>}>
				<p id="b">body</p>
			</Modal>,
		);
		const dialog = q('[role="dialog"]');
		expect(dialog.getAttribute("aria-label")).toBe("Hello");
		expect(dialog.classList.contains("wide")).toBe(true);
		expect(q(".modal-head h2").textContent).toBe("Hello");
		expect(q(".modal-body #b")).toBeTruthy();
		expect(q(".modal-foot #f")).toBeTruthy();
	});

	test("has no footer bar without a footer", () => {
		mount(
			<Modal title="x" onClose={() => {}}>
				hi
			</Modal>,
		);
		expect(document.querySelector(".modal-foot")).toBeNull();
	});

	test("the close button and Escape close it; the topmost modal only", () => {
		const closed: string[] = [];
		mount(
			<>
				<Modal title="a" onClose={() => closed.push("a")}>
					a
				</Modal>
				<Modal title="b" onClose={() => closed.push("b")}>
					b
				</Modal>
			</>,
		);
		key(window as unknown as Element, "Escape");
		expect(closed).toEqual(["b"]);
		const buttons = [...document.querySelectorAll(".modal-head .close")];
		click(buttons[0] as Element);
		expect(closed).toEqual(["b", "a"]);
	});

	test("the backdrop closes it only when asked to", () => {
		let closed = 0;
		mount(
			<Modal title="a" onClose={() => closed++}>
				a
			</Modal>,
		);
		const backdrop = q(".modal-backdrop");
		act(() => {
			backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		});
		expect(closed).toBe(0);
		act(() => render(null, host as HTMLElement));
		act(() =>
			render(
				<Modal title="a" onClose={() => closed++} closeOnBackdrop>
					a
				</Modal>,
				host as HTMLElement,
			),
		);
		act(() => {
			q(".modal-backdrop").dispatchEvent(
				new MouseEvent("mousedown", { bubbles: true }),
			);
		});
		expect(closed).toBe(1);
		// A press inside the dialog does not count.
		act(() => {
			q(".modal").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		});
		expect(closed).toBe(1);
	});

	test("focus moves in, and goes back to the opener on close", () => {
		const opener = document.createElement("button");
		document.body.append(opener);
		opener.focus();
		const target = document.createElement("div");
		document.body.append(target);
		act(() =>
			render(
				<Modal title="a" onClose={() => {}}>
					a
				</Modal>,
				target,
			),
		);
		expect(document.activeElement).not.toBe(opener);
		expect(q(".modal").contains(document.activeElement)).toBe(true);
		act(() => render(null, target));
		expect(document.activeElement).toBe(opener);
	});

	test("Confirm has cancel and a primary or danger confirm button", () => {
		const log: string[] = [];
		mount(
			<Confirm
				title="Delete?"
				confirmLabel="Delete"
				danger
				onConfirm={() => log.push("yes")}
				onClose={() => log.push("no")}
			>
				Sure?
			</Confirm>,
		);
		const [cancel, confirm] = [
			...document.querySelectorAll(".modal-foot .btn"),
		] as HTMLElement[];
		expect(cancel?.textContent).toBe("Cancel");
		expect(confirm?.textContent).toBe("Delete");
		expect(confirm?.classList.contains("danger")).toBe(true);
		click(confirm as Element);
		click(cancel as Element);
		expect(log).toEqual(["yes", "no"]);
	});

	test("Confirm passes closeOnBackdrop on to the modal", () => {
		let closed = 0;
		const ui = (closeOnBackdrop?: boolean) => (
			<Confirm
				title="Delete?"
				closeOnBackdrop={closeOnBackdrop}
				onConfirm={() => {}}
				onClose={() => closed++}
			>
				Sure?
			</Confirm>
		);
		const press = () =>
			act(() => {
				q(".modal-backdrop").dispatchEvent(
					new MouseEvent("mousedown", { bubbles: true }),
				);
			});
		mount(ui());
		press();
		expect(closed).toBe(0);
		act(() => render(ui(true), host as HTMLElement));
		press();
		expect(closed).toBe(1);
	});
});

describe("toast", () => {
	test("shows messages with their kind and role, and removes them", () => {
		mount(<Toasts />);
		let id = 0;
		act(() => {
			toast("saved", "ok");
			id = toast("boom", "error");
			toast("fyi");
		});
		const items = [...document.querySelectorAll(".toast")];
		expect(items.map((t) => t.className)).toEqual([
			"toast ok",
			"toast error",
			"toast info",
		]);
		expect(items.map((t) => t.getAttribute("role"))).toEqual([
			"status",
			"alert",
			"status",
		]);
		act(() => dismissToast(id));
		expect(document.querySelectorAll(".toast")).toHaveLength(2);
	});

	test("goes away by itself after `ms`", async () => {
		mount(<Toasts />);
		act(() => {
			toast("brief", "info", 10);
		});
		expect(document.querySelectorAll(".toast")).toHaveLength(1);
		await act(() => new Promise((r) => setTimeout(r, 30)));
		expect(document.querySelectorAll(".toast")).toHaveLength(0);
	});
});

describe("Page", () => {
	test("a back link, title, actions, banner and content", () => {
		mount(
			<Page
				title="Settings"
				back={{ href: "/", label: "Map" }}
				actions={<button type="button">Act</button>}
				banner={<div id="ban">warn</div>}
			>
				<p id="c">content</p>
			</Page>,
		);
		const back = q<HTMLAnchorElement>(".page-head a.btn");
		expect(back.getAttribute("href")).toBe("/");
		expect(back.textContent).toBe("← Map");
		expect(q(".page-head h1").textContent).toBe("Settings");
		expect(q(".page-head .page-actions button")).toBeTruthy();
		expect(q("#ban")).toBeTruthy();
		expect(q(".page-inner #c")).toBeTruthy();
		expect(q(".page-root").classList.contains("embedded")).toBe(false);
	});

	test("back can be any element; embedded and stack are classes", () => {
		mount(
			<Page
				title="T"
				back={
					<button type="button" id="mine">
						Up
					</button>
				}
				embedded
				stack
			>
				x
			</Page>,
		);
		expect(q(".page-head #mine")).toBeTruthy();
		expect(q(".page-head a")).toBeNull();
		expect(q(".page-root").classList.contains("embedded")).toBe(true);
		expect(q(".page-inner").classList.contains("stack")).toBe(true);
	});
});

describe("Panel", () => {
	test("title, close, tabs, body and footer", () => {
		let closed = 0;
		mount(
			<Panel
				title="Layers"
				onClose={() => closed++}
				tabs={<nav id="t" />}
				footer={<span id="f" />}
			>
				<i id="b" />
			</Panel>,
		);
		expect(q("aside.panel").getAttribute("aria-label")).toBe("Layers");
		expect(q("#t")).toBeTruthy();
		expect(q(".panel-body #b")).toBeTruthy();
		expect(q(".panel-foot #f")).toBeTruthy();
		expect(document.querySelector(".panel-resize")).toBeNull();
		click(q(".panel-head .close"));
		expect(closed).toBe(1);
	});

	test("the resize handle moves with the arrow keys and resets on double click", () => {
		const changes: [number, boolean][] = [];
		let resets = 0;
		mount(
			<Panel
				title="P"
				onClose={() => {}}
				resize={{
					width: 400,
					min: 320,
					max: 500,
					onChange: (w, commit) => changes.push([w, commit]),
					onReset: () => resets++,
				}}
			>
				x
			</Panel>,
		);
		const handle = q(".panel-resize");
		expect(handle.getAttribute("aria-valuenow")).toBe("400");
		expect(handle.getAttribute("aria-valuemin")).toBe("320");
		key(handle, "ArrowLeft");
		key(handle, "ArrowRight", { shiftKey: true });
		key(handle, "Home");
		key(handle, "End");
		key(handle, "a");
		expect(changes).toEqual([
			[420, true],
			[320, true],
			[500, true],
			[320, true],
		]);
		act(() => {
			handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
		});
		expect(resets).toBe(1);
	});

	test("a handle on the right edge reverses the arrows", () => {
		const changes: number[] = [];
		mount(
			<Panel
				title="P"
				onClose={() => {}}
				resize={{
					width: 400,
					min: 320,
					max: 500,
					edge: "right",
					onChange: (w) => changes.push(w),
					onReset: () => {},
				}}
			>
				x
			</Panel>,
		);
		const handle = q(".panel-resize");
		expect(handle.classList.contains("right")).toBe(true);
		key(handle, "ArrowLeft");
		key(handle, "ArrowRight");
		expect(changes).toEqual([380, 420]);
	});
});

describe("Segmented and Tabs", () => {
	test("Segmented marks the value and reports clicks", () => {
		const log: string[] = [];
		mount(
			<Segmented
				value="30d"
				options={["7d", "30d", "all"] as const}
				names={{ all: "All" }}
				onChange={(v) => log.push(v)}
				label="Range"
			/>,
		);
		const buttons = [...document.querySelectorAll(".segmented .btn")];
		expect(buttons.map((b) => b.textContent)).toEqual(["7d", "30d", "All"]);
		expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual([
			"false",
			"true",
			"false",
		]);
		expect(buttons[1]?.classList.contains("active")).toBe(true);
		click(buttons[0] as Element);
		expect(log).toEqual(["7d"]);
		expect(q("legend").textContent).toBe("Range");
	});

	test("Tabs: buttons call onChange; links keep their href and hand over to onChange", () => {
		const log: string[] = [];
		mount(
			<>
				<Tabs
					value="a"
					tabs={[
						{ id: "a", label: "A" },
						{ id: "b", label: "B" },
					]}
					onChange={(id) => log.push(id)}
				/>
				<Tabs
					value="x"
					tabs={[
						{ id: "x", label: "X", href: "/x" },
						{ id: "y", label: "Y", href: "/y" },
					]}
					onChange={(id) => log.push(id)}
				/>
			</>,
		);
		const tabs = [...document.querySelectorAll(".tab")];
		expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual([
			"true",
			"false",
			null,
			null,
		]);
		expect(tabs.map((t) => t.getAttribute("aria-current"))).toEqual([
			null,
			null,
			"page",
			null,
		]);
		click(tabs[1] as Element);
		const link = tabs[3] as HTMLAnchorElement;
		expect(link.getAttribute("href")).toBe("/y");
		const ev = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			button: 0,
		});
		act(() => {
			link.dispatchEvent(ev);
		});
		expect(ev.defaultPrevented).toBe(true);
		expect(log).toEqual(["b", "y"]);
		// A modified click is left to the browser.
		const mod = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			button: 0,
			ctrlKey: true,
		});
		act(() => {
			link.dispatchEvent(mod);
		});
		expect(mod.defaultPrevented).toBe(false);
		expect(log).toEqual(["b", "y"]);
	});
});

describe("Toggle", () => {
	test("a settings row by default: a switch input and its text", () => {
		const log: boolean[] = [];
		mount(
			<Toggle
				checked={false}
				onChange={(v) => log.push(v)}
				label="Dark"
				hint="Easier on the eyes"
			/>,
		);
		const label = q("label");
		expect(label.className).toContain("toggle");
		const input = q<HTMLInputElement>("input.switch");
		expect(input.type).toBe("checkbox");
		expect(q(".toggle-text").textContent).toContain("Dark");
		expect(q(".toggle-text .hint").textContent).toBe("Easier on the eyes");
		act(() => {
			input.checked = true;
			input.dispatchEvent(new Event("change", { bubbles: true }));
		});
		expect(log).toEqual([true]);
	});

	test("inline uses the check row; disabled is passed on", () => {
		mount(<Toggle checked inline disabled label="x" onChange={() => {}} />);
		expect(q("label").classList.contains("check")).toBe(true);
		expect(q("label").classList.contains("disabled")).toBe(true);
		expect(q<HTMLInputElement>("input").disabled).toBe(true);
		expect(q<HTMLInputElement>("input").checked).toBe(true);
	});

	test("bold only applies to inline toggles", () => {
		mount(
			<>
				<Toggle checked inline bold label="a" onChange={() => {}} />
				<Toggle checked inline label="b" onChange={() => {}} />
				<Toggle checked bold label="c" onChange={() => {}} />
			</>,
		);
		const [a, b, c] = [...document.querySelectorAll("label")];
		expect(a?.classList.contains("bold")).toBe(true);
		expect(b?.classList.contains("bold")).toBe(false);
		expect(c?.classList.contains("bold")).toBe(false);
	});

	test("title is the tooltip of the whole row", () => {
		mount(
			<Toggle
				checked={false}
				inline
				label="Private"
				title="Only the creator can change this"
				onChange={() => {}}
			/>,
		);
		expect(q("label").getAttribute("title")).toBe(
			"Only the creator can change this",
		);
		expect(q(".check > input.switch + .toggle-text").textContent).toBe(
			"Private",
		);
	});

	test("without a label the aria-label names it", () => {
		mount(<Toggle checked={false} ariaLabel="Mute" onChange={() => {}} />);
		expect(q("input").getAttribute("aria-label")).toBe("Mute");
		expect(document.querySelector(".toggle-text")).toBeNull();
	});
});

describe("tables", () => {
	test("SortTh shows the direction on the active column only", () => {
		const log: string[] = [];
		mount(
			<table>
				<thead>
					<tr>
						<SortTh
							label="Name"
							col="name"
							sort="hours"
							dir="desc"
							onSort={(c) => log.push(c)}
						/>
						<SortTh
							label="Hours"
							col="hours"
							sort="hours"
							dir="desc"
							num
							onSort={(c) => log.push(c)}
						/>
						<SortTh
							label="Old"
							col="old"
							sort="old"
							dir="asc"
							onSort={() => {}}
						/>
					</tr>
				</thead>
			</table>,
		);
		const ths = [...document.querySelectorAll("th")];
		expect(ths.map((t) => t.getAttribute("aria-sort"))).toEqual([
			"none",
			"descending",
			"ascending",
		]);
		expect(ths.map((t) => t.textContent)).toEqual(["Name", "Hours ▼", "Old ▲"]);
		expect(ths[1]?.className).toBe("num");
		click(q("th button"));
		expect(log).toEqual(["name"]);
	});

	test("Pager shows the total when it fits, and pages otherwise", () => {
		const log: number[] = [];
		mount(<Pager offset={0} limit={10} total={7} onChange={() => {}} />);
		expect(q(".pager").textContent).toBe("7 total");
		act(() =>
			render(
				<Pager
					offset={10}
					limit={10}
					total={35}
					onChange={(o) => log.push(o)}
				/>,
				host as HTMLElement,
			),
		);
		expect(q(".pager").textContent).toContain("Page 2 of 4 (35 total)");
		const [prev, next] = [
			...document.querySelectorAll(".pager button"),
		] as HTMLButtonElement[];
		click(prev as Element);
		click(next as Element);
		expect(log).toEqual([0, 20]);
		act(() =>
			render(
				<Pager offset={30} limit={10} total={35} onChange={() => {}} />,
				host as HTMLElement,
			),
		);
		const buttons = [
			...document.querySelectorAll(".pager button"),
		] as HTMLButtonElement[];
		expect(buttons[1]?.disabled).toBe(true);
	});
});

describe("Async and friends", () => {
	const state = <T,>(over: Partial<AsyncState<T>>): AsyncState<T> => ({
		data: null,
		error: null,
		loading: false,
		reload: () => {},
		...over,
	});

	test("loading, error with retry, then data (dimmed while reloading)", () => {
		mount(<Async state={state({ loading: true })}>{() => <p>never</p>}</Async>);
		expect(q(".state").textContent).toBe("Loading…");
		let retried = 0;
		act(() =>
			render(
				<Async state={state({ error: "boom", reload: () => retried++ })}>
					{() => <p>never</p>}
				</Async>,
				host as HTMLElement,
			),
		);
		expect(q(".error-box span").textContent).toBe("boom");
		click(q(".error-box button"));
		expect(retried).toBe(1);
		act(() =>
			render(
				<Async state={state({ data: 5, loading: true, error: "stale" })}>
					{(n) => <p id="d">{n * 2}</p>}
				</Async>,
				host as HTMLElement,
			),
		);
		expect(q("#d").textContent).toBe("10");
		expect(q(".fade")).toBeTruthy();
		expect(q(".error-box")).toBeTruthy();
	});

	test("Loading, Empty and ErrorBox", () => {
		mount(
			<>
				<Loading>Fetching</Loading>
				<Empty />
				<ErrorBox message="bad" />
			</>,
		);
		expect(document.body.textContent).toContain("Fetching");
		expect(document.body.textContent).toContain("Nothing here yet.");
		expect(q(".error-box").getAttribute("role")).toBe("alert");
		expect(document.querySelector(".error-box button")).toBeNull();
	});
});

describe("small components", () => {
	test("Avatar: initials on a name-derived colour, or an image", () => {
		mount(
			<>
				<Avatar name="alex" size={20} round />
				<Avatar name="alex" src="/a.png" />
				<Avatar name="alex" />
				<Avatar name="Steve" />
			</>,
		);
		const colours = [...document.querySelectorAll(".avatar.initials")].map(
			(el) => /var\(--avatar-(\d)\)/.exec(el.getAttribute("style") ?? "")?.[1],
		);
		// The same name always gets the same colour, one of the eight.
		expect(colours[0]).toBe(colours[1]);
		for (const c of colours) {
			expect(Number(c)).toBeGreaterThanOrEqual(1);
			expect(Number(c)).toBeLessThanOrEqual(8);
		}
		const initials = q(".avatar.initials");
		expect(initials.textContent).toBe("A");
		expect(initials.classList.contains("round")).toBe(true);
		expect(initials.getAttribute("style")).toContain("--avatar-size: 20px");
		expect(initials.getAttribute("style")).toContain("var(--avatar-");
		expect(q<HTMLImageElement>("img.avatar").getAttribute("src")).toBe(
			"/a.png",
		);
	});

	test("Dot, Badge, Count, Field, Card, Tile", () => {
		mount(
			<>
				<Dot color="red" label="Lobby" />
				<Badge kind="running">Running</Badge>
				<Badge>Plain</Badge>
				<Count>3</Count>
				<Field label="Name" hint="Shown to everyone">
					<input type="text" />
				</Field>
				<Card
					title="T"
					actions={<button type="button">a</button>}
					footer="foot"
					inner
				>
					body
				</Card>
				<TileGrid tiles={[{ label: "Players", value: "12", hint: "now" }]} />
				<Tile label="X" value={1} />
			</>,
		);
		expect(q(".dot").getAttribute("style")).toContain("red");
		expect(q(".dot-wrap").getAttribute("title")).toBe("Lobby");
		expect(q(".badge.running").textContent).toBe("Running");
		expect(q(".count").textContent).toBe("3");
		expect(q(".field label .label").textContent).toBe("Name");
		expect(q(".field > .hint").textContent).toBe("Shown to everyone");
		expect(q("section.card.inner .card-head h2").textContent).toBe("T");
		expect(q(".card-foot").textContent).toBe("foot");
		expect(q(".tiles .tile .tile-value").textContent).toBe("12");
		expect(q(".tile-hint").textContent).toBe("now");
	});

	test("ConnectionBadge", () => {
		mount(<ConnectionBadge status="down" />);
		expect(q(".conn").className).toBe("conn conn-down");
		expect(q(".conn").textContent).toContain("Reconnecting…");
		const down = q(".conn").getAttribute("title");
		act(() =>
			render(<ConnectionBadge status="connecting" />, host as HTMLElement),
		);
		expect(q(".conn").getAttribute("title")).toContain("Connecting");
		expect(q(".conn").getAttribute("title")).not.toBe(down);
		act(() =>
			render(
				<ConnectionBadge status="live" labels={{ live: "Online" }} />,
				host as HTMLElement,
			),
		);
		expect(q(".conn").textContent).toContain("Online");
	});

	test("Progress: a width when known, animated when not", () => {
		mount(<Progress value={0.256} label="Reading 1/4" />);
		expect(q(".progress").getAttribute("aria-valuenow")).toBe("26");
		expect(q<HTMLElement>(".progress .bar").style.width).toBe("26%");
		expect(q(".progress-wrap .muted").textContent).toBe("Reading 1/4");
		act(() => render(<Progress />, host as HTMLElement));
		expect(q(".progress .bar").classList.contains("indeterminate")).toBe(true);
		expect(q(".progress").getAttribute("aria-valuenow")).toBeNull();
		expect(document.querySelector(".progress-wrap")).toBeNull();
	});

	test("BossBar: colour, fill and action", () => {
		let acted = 0;
		mount(
			<BossBar
				title={<b>Maintenance</b>}
				fill={0.5}
				color="maintenance"
				action="Turn off"
				onAction={() => acted++}
			/>,
		);
		expect(q(".bossbar").className).toBe("bossbar maintenance");
		expect(q(".bossbar-track").className).toBe("bossbar-track maintenance");
		expect(q<HTMLElement>(".bossbar-track span").style.width).toBe("50%");
		click(q(".bossbar .btn"));
		expect(acted).toBe(1);
	});

	test("PopupText renders bold and safe links, never HTML", () => {
		mount(<PopupText text={"a **b** [c](https://e.com)\n<img src=x>"} />);
		expect(q("strong").textContent).toBe("b");
		const a = q<HTMLAnchorElement>("a");
		expect(a.getAttribute("href")).toBe("https://e.com/");
		expect(a.getAttribute("rel")).toContain("noopener");
		expect(document.querySelector("img")).toBeNull();
		expect(q(".popup-text").textContent).toContain("<img src=x>");
	});
});

describe("PreviewSelect", () => {
	const options = [
		{ value: "a", label: "Alpha", preview: <i class="p">a</i> },
		{
			value: "b",
			label: "Beta",
			preview: <i class="p">b</i>,
			scope: { "data-palette": "dye-red", "data-mode": "dark" },
		},
	];

	test("opens, chooses, and closes on Escape", () => {
		const log: string[] = [];
		mount(
			<PreviewSelect
				options={options}
				value="a"
				label="Pick"
				onChange={(v) => log.push(v)}
			/>,
		);
		const button = q(".preview-select-button");
		expect(button.textContent).toContain("Alpha");
		expect(document.querySelector(".preview-select-list")).toBeNull();
		click(button);
		expect(q(".preview-select-list").getAttribute("role")).toBe("listbox");
		const scoped = q('.preview-select-list [data-palette="dye-red"]');
		expect(scoped.classList.contains("palette-scope")).toBe(true);
		key(q(".preview-select"), "Escape");
		expect(document.querySelector(".preview-select-list")).toBeNull();
		click(button);
		click(q('.preview-select-option[aria-selected="false"]'));
		expect(log).toEqual(["b"]);
		expect(document.querySelector(".preview-select-list")).toBeNull();
	});
});

describe("Grip, moveFocus", () => {
	test("Grip: arrow keys move the row, and stay within the list", () => {
		const moves: [number, number][] = [];
		mount(
			<ul>
				<li>
					<Grip
						id="g1"
						label="first"
						index={1}
						count={3}
						onMove={(f, t) => moves.push([f, t])}
					/>
				</li>
			</ul>,
		);
		const grip = q(".grip");
		expect(grip.getAttribute("aria-label")).toBe("Move first");
		key(grip, "ArrowUp");
		key(grip, "ArrowDown");
		key(grip, "ArrowLeft");
		expect(moves).toEqual([
			[1, 0],
			[1, 2],
		]);
	});

	test("Grip at the ends does not move out of the list", () => {
		const moves: number[] = [];
		mount(
			<ul>
				<li>
					<Grip
						id="g"
						label="x"
						index={0}
						count={2}
						onMove={(_, t) => moves.push(t)}
					/>
				</li>
			</ul>,
		);
		key(q(".grip"), "ArrowUp");
		expect(moves).toEqual([]);
	});

	test("moveFocus wraps and skips disabled items", () => {
		const menu = mount(
			<div>
				<button type="button" class="menu-item" id="m1">
					1
				</button>
				<button type="button" class="menu-item" id="m2" disabled>
					2
				</button>
				<button type="button" class="menu-item" id="m3">
					3
				</button>
			</div>,
		);
		moveFocus(menu, 1);
		expect(document.activeElement?.id).toBe("m1");
		moveFocus(menu, 1);
		expect(document.activeElement?.id).toBe("m3");
		moveFocus(menu, 1);
		expect(document.activeElement?.id).toBe("m1");
		moveFocus(menu, -1);
		expect(document.activeElement?.id).toBe("m3");
		(document.activeElement as HTMLElement).blur();
		moveFocus(menu, -1);
		expect(document.activeElement?.id).toBe("m3");
	});
});

describe("share helpers", () => {
	const clipboard = (writeText: (t: string) => Promise<void>) =>
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});

	test("copyText reports success or failure through notify", async () => {
		const copied: string[] = [];
		clipboard(async (t) => {
			copied.push(t);
		});
		const notes: [string, string][] = [];
		await copyText("abc", "Copied", (t, k) => notes.push([t, k]));
		expect(copied).toEqual(["abc"]);
		expect(notes).toEqual([["Copied", "ok"]]);
		clipboard(async () => {
			throw new Error("denied");
		});
		await copyText("abc", "Copied", (t, k) => notes.push([t, k]));
		expect(notes[1]?.[1]).toBe("error");
	});

	test("copyText falls back to a toast", async () => {
		mount(<Toasts />);
		clipboard(async () => {});
		await act(() => copyText("x", "Link copied"));
		expect(q(".toast.ok").textContent).toBe("Link copied");
	});

	test("ExpirySelect maps null to never", () => {
		const log: (number | null)[] = [];
		mount(
			<ExpirySelect
				options={[
					{ label: "1 hour", value: 3600 },
					{ label: "Never", value: null },
				]}
				value={null}
				onChange={(v) => log.push(v)}
			/>,
		);
		const select = q<HTMLSelectElement>("select");
		expect(select.value).toBe("never");
		act(() => {
			select.value = "3600";
			select.dispatchEvent(new Event("change", { bubbles: true }));
		});
		expect(log).toEqual([3600]);
	});

	test("ShownOnce shows the value read-only with copy and done", () => {
		let done = 0;
		mount(
			<ShownOnce
				intro="Copy it now."
				value="secret"
				label="Token"
				copied="Copied"
				onDone={() => done++}
			/>,
		);
		const input = q<HTMLInputElement>(".shown-once input");
		expect(input.value).toBe("secret");
		expect(input.readOnly).toBe(true);
		const buttons = [...document.querySelectorAll(".copy-row .btn")];
		expect(buttons.map((b) => b.textContent)).toEqual(["Copy", "Done"]);
		click(buttons[1] as Element);
		expect(done).toBe(1);
	});
});

describe("Field", () => {
	test("flow makes it an ordinary block with its own margin", () => {
		mount(
			<>
				<Field label="A" hint="why">
					<input />
				</Field>
				<Field label="B" flow>
					<input />
				</Field>
			</>,
		);
		const [a, b] = [...document.querySelectorAll(".field")];
		expect(a?.classList.contains("flow")).toBe(false);
		expect(b?.classList.contains("flow")).toBe(true);
		expect(a?.querySelector(".label")?.textContent).toBe("A");
		expect(a?.querySelector(".hint")?.textContent).toBe("why");
	});
});

describe("Chart", () => {
	const labels = () =>
		[...document.querySelectorAll(".chart-label")]
			.map((t) => t.textContent)
			.filter((t) => t?.startsWith("d"));

	test("steps spread their x ticks by time, and close readings share one label", () => {
		// Readings at days 0 and 100, then four in the last hour.
		const day = 86_400_000;
		const xs = [
			0,
			100 * day,
			200 * day,
			400 * day - 3,
			400 * day - 2,
			400 * day - 1,
			400 * day,
		];
		mount(
			<Chart
				kind="steps"
				xs={xs}
				series={[
					{ key: "a", label: "A", color: "red", values: xs.map(() => 1) },
				]}
				formatY={String}
				formatX={(t) => `d${Math.round(t / day)}`}
			/>,
		);
		expect(labels()).toEqual(["d0", "d100", "d200", "d400"]);
	});

	test("fit starts the value axis near the lowest value, and still reaches the highest", () => {
		const values = [6020, 6050, 6130];
		const yLabels = (fit: boolean) => {
			document.body.innerHTML = "";
			mount(
				<Chart
					kind="steps"
					xs={[0, 1, 2]}
					fit={fit}
					series={[{ key: "a", label: "A", color: "red", values }]}
					formatY={(v) => `y${v}`}
					formatX={String}
				/>,
			);
			return [...document.querySelectorAll(".chart-label")]
				.map((t) => t.textContent ?? "")
				.filter((t) => t.startsWith("y"))
				.map((t) => Number(t.slice(1)));
		};
		const plain = yLabels(false);
		expect(Math.min(...plain)).toBe(0);
		const fitted = yLabels(true);
		expect(Math.min(...fitted)).toBeGreaterThan(5900);
		expect(Math.min(...fitted)).toBeLessThanOrEqual(6020);
		expect(Math.max(...fitted)).toBeGreaterThanOrEqual(6130);
		expect(Math.max(...fitted)).toBeLessThan(6300);
	});
});

describe("TileGrid", () => {
	const tiles = [
		{ label: "Players", value: 3 },
		{ label: "Hours", value: "1.5", hint: "total" },
	];

	test("plain and min are opt-in", () => {
		mount(<TileGrid tiles={tiles} />);
		expect(q(".tiles").className.trim()).toBe("tiles");
		expect(q(".tiles").getAttribute("style")).toBeNull();
		expect(document.querySelectorAll(".tile")).toHaveLength(2);
		expect(q(".tile-hint").textContent).toBe("total");
	});

	test("plain adds the modifier, min sets the grid's column width", () => {
		mount(<TileGrid tiles={tiles} plain min={240} />);
		expect(q(".tiles").classList.contains("plain")).toBe(true);
		expect(q(".tiles").style.getPropertyValue("--tile-min")).toBe("240px");
	});
});

describe("appearance pickers", () => {
	const buttons = () => [
		...document.querySelectorAll<HTMLElement>(".choice-picker .btn"),
	];

	test("ModePicker marks the value and reports the choice", () => {
		const log: string[] = [];
		mount(<ModePicker value="dark" onChange={(m) => log.push(m)} />);
		expect(q(".choice-picker legend").textContent).toBe("Colours");
		expect(buttons().map((b) => b.textContent)).toEqual([
			"System",
			"Dark",
			"Light",
		]);
		expect(buttons().map((b) => b.getAttribute("aria-pressed"))).toEqual([
			"false",
			"true",
			"false",
		]);
		click(buttons()[2] as Element);
		expect(log).toEqual(["light"]);
		expect(q(".choice-picker").classList.contains("narrow")).toBe(false);
	});

	test("ModePicker can be narrow and relabelled", () => {
		mount(
			<ModePicker value="system" onChange={() => {}} label="Theme" narrow />,
		);
		expect(q(".choice-picker legend").textContent).toBe("Theme");
		expect(q(".choice-picker").classList.contains("narrow")).toBe(true);
	});

	test("ChoicePicker takes any options, with a hint", () => {
		const log: string[] = [];
		mount(
			<ChoicePicker
				label="Speed"
				value="fast"
				options={[
					{ id: "slow", name: "Slow" },
					{ id: "fast", name: "Fast" },
				]}
				hint="How quickly it moves."
				onChange={(v) => log.push(v)}
			/>,
		);
		expect(q(".choice-picker .hint").textContent).toBe("How quickly it moves.");
		click(buttons()[0] as Element);
		expect(log).toEqual(["slow"]);
		expect(buttons()[1]?.classList.contains("active")).toBe(true);
	});

	const radios = () => [
		...document.querySelectorAll<HTMLInputElement>(".style-option input"),
	];

	test("StylePicker draws a preview per style and reports the choice", () => {
		const log: string[] = [];
		mount(
			<StylePicker
				value="xp"
				previewTitle="Players"
				previewButtons={["Sync", "Save"]}
				onChange={(s) => log.push(s)}
			/>,
		);
		expect(q(".style-picker legend").textContent).toBe("Style");
		const options = [...document.querySelectorAll(".style-option")];
		expect(options).toHaveLength(4);
		expect(
			[...document.querySelectorAll(".style-preview")].map((p) =>
				p.getAttribute("data-style"),
			),
		).toEqual(["bedrock", "win98", "xp", "modern"]);
		expect(q(".preview-head").textContent).toBe("Players");
		expect(
			[...document.querySelectorAll(".preview-body .btn")]
				.slice(0, 2)
				.map((b) => b.textContent),
		).toEqual(["Sync", "Save"]);
		expect(q(".style-name").textContent).toBe("Bedrock");
		expect(radios().map((r) => r.checked)).toEqual([false, false, true, false]);
		expect(options.map((o) => o.classList.contains("selected"))).toEqual([
			false,
			false,
			true,
			false,
		]);
		const names = new Set(radios().map((r) => r.name));
		expect(names.size).toBe(1);
		act(() => {
			(radios()[1] as HTMLInputElement).dispatchEvent(
				new Event("change", { bubbles: true }),
			);
		});
		expect(log).toEqual(["win98"]);
	});

	test("StylePicker previews are aria-hidden and have defaults", () => {
		mount(<StylePicker value="bedrock" onChange={() => {}} />);
		expect(q(".style-preview").getAttribute("aria-hidden")).toBe("true");
		expect(q(".preview-head").textContent).toBe("Window");
		expect(q(".style-preview").hasAttribute("data-palette")).toBe(false);
	});

	test("a palette gives each preview its own, in its own style", () => {
		appearance.value = { mode: "light", style: "modern", palette: null };
		mount(<StylePicker value="bedrock" palette="nether" onChange={() => {}} />);
		const previews = [...document.querySelectorAll(".style-preview")];
		expect(previews.map((p) => p.getAttribute("data-palette"))).toEqual([
			"nether",
			"nether",
			"nether",
			"nether",
		]);
		expect(previews.map((p) => p.getAttribute("data-mode"))).toEqual([
			"light",
			"light",
			"light",
			"light",
		]);
		expect(previews.map((p) => p.getAttribute("data-style"))).toEqual([
			"bedrock",
			"win98",
			"xp",
			"modern",
		]);
		appearance.value = null;
	});

	test("two pickers on a page do not share a radio group", () => {
		mount(
			<>
				<StylePicker value="bedrock" onChange={() => {}} />
				<StylePicker value="xp" onChange={() => {}} />
			</>,
		);
		expect(new Set(radios().map((r) => r.name)).size).toBe(2);
	});
});
