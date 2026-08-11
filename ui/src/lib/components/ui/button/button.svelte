<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const buttonVariants = tv({
		base: "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
		variants: {
			variant: {
				default:
					"border border-neutral-200 bg-white text-black hover:bg-neutral-100 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-fg dark:hover:bg-white/[0.1]",
				highlighted:
					"border border-transparent bg-gradient-to-b from-coollabs-100 to-coollabs-200 text-white hover:from-coollabs-100 hover:to-coollabs hover:text-white rounded-lg",
				destructive:
					"border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-900/25 dark:text-red-300 dark:hover:bg-red-900/40",
				outline:
					"border border-neutral-200 bg-transparent text-black hover:bg-neutral-100 dark:border-white/[0.08] dark:text-fg dark:hover:bg-white/[0.06]",
				secondary:
					"border border-transparent bg-neutral-100 text-black hover:bg-neutral-200 dark:bg-white/[0.06] dark:text-fg dark:hover:bg-white/[0.1]",
				ghost:
					"border border-transparent bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-black dark:text-fg-dim dark:hover:bg-white/[0.06] dark:hover:text-fg",
				link: "border-0 text-coollabs hover:underline dark:text-coollabs-100",
			},
			size: {
				default: "h-10 px-4",
				sm: "h-8 px-2.5 text-[13px]",
				lg: "h-11 px-5",
				icon: "size-8",
				"icon-sm": "size-7",
				"icon-lg": "size-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
