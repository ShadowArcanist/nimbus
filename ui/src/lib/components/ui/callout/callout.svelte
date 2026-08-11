<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const calloutVariants = tv({
		base: "relative flex gap-2.5 rounded-lg p-3 text-sm ring-1 ring-inset",
		variants: {
			type: {
				warning:
					"bg-warning-50 text-yellow-800 ring-warning-200 dark:bg-warning/10 dark:text-warning dark:ring-warning/25 [&_.callout-icon]:text-yellow-600 dark:[&_.callout-icon]:text-warning",
				danger:
					"bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900/50 [&_.callout-icon]:text-red-600 dark:[&_.callout-icon]:text-red-400",
				info: "bg-neutral-50 text-neutral-700 ring-neutral-200 dark:bg-white/[0.03] dark:text-fg-dim dark:ring-white/[0.06] [&_.callout-icon]:text-neutral-400 dark:[&_.callout-icon]:text-fg-faint",
				success:
					"bg-green-50 text-green-800 ring-green-200 dark:bg-green-950/30 dark:text-green-300 dark:ring-green-900/50 [&_.callout-icon]:text-green-600 dark:[&_.callout-icon]:text-green-400",
			},
		},
		defaultVariants: {
			type: "info",
		},
	});

	export type CalloutType = VariantProps<typeof calloutVariants>["type"];

	export type CalloutProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		type?: CalloutType;
		title?: string;
		icon?: import("svelte").Snippet;
	};
</script>

<script lang="ts">
	let {
		ref = $bindable(null),
		class: className,
		type = "info",
		title,
		icon,
		children,
		...restProps
	}: CalloutProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="callout"
	class={cn(calloutVariants({ type }), className)}
	{...restProps}
>
	{#if icon}
		<div class="callout-icon shrink-0">{@render icon()}</div>
	{/if}
	<div class="flex-1 text-sm">
		{#if title}
			<div class="callout-title font-medium mb-1">{title}</div>
		{/if}
		<div class="callout-body">{@render children?.()}</div>
	</div>
</div>
