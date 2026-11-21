import { fileURLToPath } from "node:url";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { prepaintScript } from "../src/theme/prepaint";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	root,
	base: process.env.PAGES_BASE ?? "/",
	plugins: [
		preact(),
		{
			// Applies the saved mode, style and palette before the first paint.
			name: "block-ui-prepaint",
			transformIndexHtml: () => [
				{
					tag: "script",
					children: prepaintScript({
						storageKey: "block-ui.demo",
						palettes: ["overworld", "nether"],
					}),
					injectTo: "head-prepend",
				},
			],
		},
	],
	build: {
		outDir: fileURLToPath(new URL("./dist", import.meta.url)),
		emptyOutDir: true,
	},
});
