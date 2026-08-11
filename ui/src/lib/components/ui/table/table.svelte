<script lang="ts">
	import type { HTMLTableAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLTableAttributes> = $props();
</script>

<div data-slot="table-container" class="relative w-full overflow-hidden overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-white/[0.07] dark:bg-[#0b0b0b]">
	<table
		bind:this={ref}
		data-slot="table"
		class={cn(
			"w-full min-w-[42rem] border-collapse caption-bottom text-left text-[13px]",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</table>
</div>
