<script lang="ts">
  import { Button } from '$lib/components/ui/button'

  type Props = {
    open?: boolean
    title: string
    description?: string
    loading?: boolean
    onClose?: () => void
    children?: import('svelte').Snippet
    footer?: import('svelte').Snippet
  }

  let {
    open = $bindable(false),
    title,
    description,
    loading = false,
    onClose,
    children,
    footer,
  }: Props = $props()

  function close() {
    if (loading) return
    if (onClose) onClose()
    else open = false
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!open) return
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <button
    type="button"
    class="fixed inset-0 z-40 cursor-default bg-black/70"
    aria-label="Close dialog"
    disabled={loading}
    onclick={close}
  ></button>
  <div class="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      tabindex="-1"
      class="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white text-black shadow-[0_24px_64px_rgba(0,0,0,0.55)] dark:border-white/[0.08] dark:bg-[#101010] dark:text-fg"
    >
      <div class="flex items-center justify-between gap-3 border-b border-neutral-100 px-6 py-4 dark:border-white/[0.06]">
        <h2 id="dialog-title" class="min-w-0 truncate text-[17px] font-normal text-black dark:text-neutral-200">{title}</h2>
        <button
          type="button"
          class="grid size-8 shrink-0 place-items-center rounded-lg text-xl font-light text-neutral-400 transition-colors hover:text-black disabled:opacity-40 dark:text-fg-faint dark:hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label="Close dialog"
          disabled={loading}
          onclick={close}
        >
          ×
        </button>
      </div>

      <div class="px-6 py-6 text-sm text-neutral-700 dark:text-fg-dim">
        {#if description}
          <p class="mb-4 text-sm text-neutral-500 dark:text-fg-dim">{description}</p>
        {/if}
        {@render children?.()}
      </div>

      <div class="flex flex-wrap justify-end gap-2.5 border-t border-neutral-100 px-6 py-5 dark:border-white/[0.06]">
        {#if footer}
          {@render footer()}
        {:else}
          <Button type="button" variant="default" disabled={loading} onclick={close}>Close</Button>
        {/if}
      </div>
    </div>
  </div>
{/if}
