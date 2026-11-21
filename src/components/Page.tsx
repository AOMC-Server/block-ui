import { type ComponentChildren, isValidElement } from "preact";
import { cx } from "../lib/cx";

export type BackLink = { href: string; label: string };

const isBackLink = (back: unknown): back is BackLink =>
	typeof back === "object" &&
	back !== null &&
	!isValidElement(back) &&
	typeof (back as BackLink).href === "string";

/**
 * Layout of a standalone page: a title bar with an optional way back and actions, an optional
 * banner under it, and the content centred in a column (`--page-max` wide). It fills the window;
 * pass `embedded` for a page inside an app shell, which then scrolls with its container.
 * `stack` spaces the direct children of the content evenly.
 */
export function Page(props: {
	title: string;
	/** A link back (`{ href, label }`, drawn as "← label"), or your own element. */
	back?: BackLink | ComponentChildren;
	/** Buttons and other controls at the end of the title bar. */
	actions?: ComponentChildren;
	/** Shown under the title bar (a warning, a notice). */
	banner?: ComponentChildren;
	embedded?: boolean;
	stack?: boolean;
	class?: string;
	children: ComponentChildren;
}) {
	const { back } = props;
	return (
		<div class={cx("page-root", props.embedded && "embedded", props.class)}>
			<header class="page-head">
				{isBackLink(back) ? (
					<a class="btn small" href={back.href}>
						← {back.label}
					</a>
				) : (
					(back as ComponentChildren)
				)}
				<h1>{props.title}</h1>
				{props.actions && <div class="page-actions">{props.actions}</div>}
			</header>
			{props.banner}
			<main class="page">
				<div class={cx("page-inner", props.stack && "stack")}>
					{props.children}
				</div>
			</main>
		</div>
	);
}
