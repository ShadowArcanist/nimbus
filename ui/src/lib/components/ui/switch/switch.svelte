<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLButtonAttributes> & {
		checked?: boolean;
	};

	let {
		ref = $bindable(null),
		class: className,
		checked = false,
		disabled,
		type = "button",
		...restProps
	}: Props = $props();

	const state = $derived(checked ? "checked" : "unchecked");
</script>

<button
	bind:this={ref}
	data-slot="switch"
	data-state={state}
	role="switch"
	aria-checked={checked}
	{type}
	{disabled}
	class={cn(
		"inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-neutral-200 p-0.5 outline-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:bg-coollabs dark:bg-white/[0.12] dark:data-[state=checked]:bg-coollabs-100",
		className
	)}
	{...restProps}
>
	<span
		data-slot="switch-thumb"
		data-state={state}
		class="pointer-events-none block size-3 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[14px]"
	></span>
</button>
