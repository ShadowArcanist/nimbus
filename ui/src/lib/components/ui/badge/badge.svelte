<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const badgeVariants = tv({
		base: "status-dot",
		variants: {
			variant: {
				success: "bg-success",
				warning: "bg-warning",
				error: "bg-error",
			},
		},
		defaultVariants: {
			variant: "success",
		},
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

	export type BadgeProps = WithElementRef<HTMLAttributes<HTMLSpanElement>> & {
		variant?: BadgeVariant;
		label?: string;
	};
</script>

<script lang="ts">
	let {
		ref = $bindable(null),
		class: className,
		variant = "success",
		label,
		...restProps
	}: BadgeProps = $props();

</script>

{#if label}
	<span
		bind:this={ref}
		data-slot="badge"
		class={cn("status-badge", className)}
		{...restProps}
	>
		<span class={badgeVariants({ variant })}></span>
		<span class="text-neutral-700 dark:text-fg">{label}</span>
	</span>
{:else}
	<span
		bind:this={ref}
		data-slot="badge"
		class={cn("status-badge", className)}
		{...restProps}
	>
		<span class={badgeVariants({ variant })}></span>
	</span>
{/if}
