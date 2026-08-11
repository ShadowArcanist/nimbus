<script lang="ts">
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
  import Check from "lucide-svelte/icons/check";

  type Option = { value: string; label: string; description?: string };

  type Props = {
    value: string;
    options: Option[];
    onChange?: (value: string) => void;
    disabled?: boolean;
    id?: string;
    class?: string;
    "aria-label"?: string;
  };

  let {
    value,
    options,
    onChange,
    disabled = false,
    id,
    class: className = "",
    "aria-label": ariaLabel,
  }: Props = $props();

  let open = $state(false);
  let rootEl = $state<HTMLDivElement | null>(null);

  const selected = $derived(options.find((o) => o.value === value));

  function toggle() {
    if (disabled) return;
    open = !open;
  }

  function pick(option: Option) {
    open = false;
    if (option.value !== value) onChange?.(option.value);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      open = false;
    }
  }

  function handleOutside(e: MouseEvent) {
    if (open && rootEl && !rootEl.contains(e.target as Node)) {
      open = false;
    }
  }
</script>

<svelte:window onmousedown={handleOutside} onkeydown={handleKeydown} />

<div bind:this={rootEl} class={`relative ${className}`}>
  <button
    {id}
    type="button"
    onclick={toggle}
    {disabled}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={ariaLabel}
    class="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-black transition-colors hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.06] dark:bg-[#161616] dark:text-fg dark:hover:border-white/[0.12] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
  >
    <span class="min-w-0 truncate text-left">{selected?.label ?? value}</span>
    <ChevronsUpDown class="size-4 shrink-0 text-neutral-400 dark:text-fg-faint" />
  </button>

  {#if open}
    <div
      role="listbox"
      class="absolute right-0 top-full z-50 mt-1.5 min-w-full overflow-hidden rounded-[10px] border border-neutral-200 bg-white p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)] dark:border-white/[0.08] dark:bg-[#101010]"
    >
      {#each options as option}
        <button
          type="button"
          role="option"
          aria-selected={option.value === value}
          onclick={() => pick(option)}
          class={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
            option.value === value
              ? "text-black dark:text-white"
              : "text-neutral-600 dark:text-fg-dim"
          } hover:bg-neutral-100 dark:hover:bg-white/[0.06]`}
        >
          <span class="min-w-0">
            <span class="block truncate font-medium">{option.label}</span>
            {#if option.description}
              <span class="block truncate text-xs text-neutral-500 dark:text-fg-faint">{option.description}</span>
            {/if}
          </span>
          {#if option.value === value}
            <Check class="size-4 shrink-0 text-accent" />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
