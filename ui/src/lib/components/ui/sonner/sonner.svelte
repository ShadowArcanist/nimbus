<script lang="ts">
  import { Toaster } from 'svelte-sonner'

  interface Props {
    theme?: 'light' | 'dark'
  }
  let { theme = 'light' }: Props = $props()
</script>

<Toaster
  {theme}
  position="bottom-right"
  closeButton
  duration={4000}
  toastOptions={{
    classes: {
      toast:
        'group !rounded-xl !font-sans !border !border-neutral-200 !bg-white !text-black !shadow-[0_12px_32px_rgba(0,0,0,0.18)] dark:!border-white/[0.08] dark:!bg-[#161618] dark:!text-fg',
      title: '!text-[13px] !font-medium',
      description: '!text-xs !text-neutral-500 dark:!text-fg-dim',
      success: '!border-l-4 !border-l-[#22c55e] [&_[data-icon]]:!text-[#22c55e]',
      error: '!border-l-4 !border-l-[#dc2626] [&_[data-icon]]:!text-[#dc2626]',
      warning: '!border-l-4 !border-l-[#facc15] [&_[data-icon]]:!text-[#facc15]',
      info: '!border-l-4 !border-l-[#e11d48] [&_[data-icon]]:!text-[#e11d48]',
      closeButton:
        '!bg-white dark:!bg-[#161618] !border-neutral-200 dark:!border-white/[0.08] !text-neutral-500 hover:!text-black dark:hover:!text-fg',
    },
  }}
/>
