<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLTableRowElement>> = $props();
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	class={cn(
		"border-t border-neutral-200 transition-colors hover:bg-neutral-50 dark:border-white/[0.05] dark:hover:bg-white/[0.02] data-[state=selected]:bg-neutral-50 dark:data-[state=selected]:bg-white/[0.03]",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</tr>
