<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const cardVariants = tv({
		base: "group flex flex-col gap-6 rounded-lg border border-neutral-200 bg-white py-6 text-black shadow-sm min-h-16 transition-colors dark:border-white/[0.06] dark:bg-surface dark:text-fg",
		variants: {
			variant: {
				default: "",
				box: "cursor-pointer hover:bg-neutral-50 dark:hover:bg-raised dark:hover:text-white hover:text-black dark:group-hover:[&_[data-slot=card-title]]:text-white dark:group-hover:[&_[data-slot=card-description]]:text-white group-hover:[&_[data-slot=card-description]]:text-black",
				coolbox:
					"cursor-pointer hover:ring-1 hover:ring-coollabs dark:hover:ring-coollabs-100",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	});

	export type CardVariant = VariantProps<typeof cardVariants>["variant"];

	export type CardProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: CardVariant;
	};
</script>

<script lang="ts">
	let {
		ref = $bindable(null),
		class: className,
		variant = "default",
		children,
		...restProps
	}: CardProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(cardVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
