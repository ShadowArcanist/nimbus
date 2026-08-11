<script lang="ts">
  import { Button, type ButtonVariant } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'

  type Props = {
    open?: boolean
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    confirmVariant?: ButtonVariant
    confirmationText?: string
    confirmationLabel?: string
    loading?: boolean
    onClose?: () => void
    onConfirm: () => void | Promise<void>
  }

  let {
    open = $bindable(false),
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmVariant = 'highlighted',
    confirmationText,
    confirmationLabel,
    loading = false,
    onClose,
    onConfirm,
  }: Props = $props()

  let typedConfirmation = $state('')
  let confirmationInput = $state<HTMLInputElement | null>(null)
  let cancelButton = $state<HTMLButtonElement | null>(null)
  const canConfirm = $derived(!confirmationText || typedConfirmation === confirmationText)
  const closeLabel = $derived(
    confirmVariant === 'destructive' || confirmationText
      ? 'Close destructive confirmation'
      : 'Close confirmation'
  )

  $effect(() => {
    if (!open) typedConfirmation = ''
  })

  $effect(() => {
    if (open) {
      queueMicrotask(() => {
        if (confirmationText) confirmationInput?.focus()
        else cancelButton?.focus()
      })
    }
  })

  function close() {
    if (loading) return
    if (onClose) onClose()
    else open = false
  }

  async function confirm() {
    if (!canConfirm || loading) return
    await onConfirm()
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
      aria-labelledby="confirm-dialog-title"
      tabindex="-1"
      class="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white text-black shadow-[0_24px_64px_rgba(0,0,0,0.55)] dark:border-white/[0.08] dark:bg-[#101010] dark:text-fg"
    >
      <div class="flex items-center justify-between gap-3 border-b border-neutral-100 px-6 py-4 dark:border-white/[0.06]">
        <h2 id="confirm-dialog-title" class="min-w-0 truncate text-[17px] font-normal text-black dark:text-neutral-200">{title}</h2>
        <button
          type="button"
          class="grid size-8 shrink-0 place-items-center rounded-lg text-xl font-light text-neutral-400 transition-colors hover:text-black disabled:opacity-40 dark:text-fg-faint dark:hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label={closeLabel}
          disabled={loading}
          onclick={close}
        >
          ×
        </button>
      </div>

      <div class="px-6 py-6">
        {#if description}
          <p class="text-sm text-neutral-500 dark:text-fg-dim">{description}</p>
        {/if}
        {#if confirmationText}
          <div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            Type <span class="font-mono font-bold">{confirmationText}</span> to confirm this destructive action.
          </div>
          <label class="mt-3 flex flex-col gap-1.5 text-[15px] font-normal text-neutral-800 dark:text-neutral-200">
            {confirmationLabel ?? 'Confirmation'}
            <Input
              bind:ref={confirmationInput}
              class=""
              bind:value={typedConfirmation}
              autocomplete="off"
              disabled={loading}
            />
          </label>
        {/if}
      </div>

      <div class="flex flex-wrap justify-end gap-2.5 border-t border-neutral-100 px-6 py-5 dark:border-white/[0.06]">
        <Button bind:ref={cancelButton} type="button" variant="default" disabled={loading} onclick={close}>{cancelLabel}</Button>
        <Button type="button" variant={confirmVariant} disabled={loading || !canConfirm} onclick={confirm}>
          {loading ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </div>
  </div>
{/if}
