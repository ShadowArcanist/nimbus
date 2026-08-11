<script lang="ts">
	import { cn } from "$lib/utils.js";
	import HelpCircle from "lucide-svelte/icons/circle-help";

	type Props = {
		text: string;
		class?: string;
	};

	let { text, class: className }: Props = $props();
</script>

<span class={cn("group relative inline-flex items-center", className)}>
	<HelpCircle class="size-4 text-coollabs dark:text-coollabs-100 cursor-pointer" />
	<span
		role="tooltip"
		class="hidden group-hover:block absolute left-5 top-0 z-40 max-w-sm rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 shadow-sm dark:border-white/10 dark:bg-raised dark:text-fg"
	>
		{text}
	</span>
</span>
