<script lang="ts">
  import { createMutation, createQuery } from '@tanstack/svelte-query'
  import { toast } from '$lib/toast'
  import { Callout } from '$lib/components/ui/callout'
  import { Listbox } from '$lib/components/ui/listbox'
  import { ConfirmDialog } from '$lib/components/ui/confirm-dialog'
  import { bucketKeys, settingsKeys } from '$lib/api/keys'
  import { getEncryption, getPublicAccess, getVersioning, setEncryption, setPublicAccess, setVersioning } from '$lib/api/settings'
  import { ApiError } from '$lib/api/http'
  import { queryClient } from '$lib/query/client'

  interface Props {
    bucket: string
    onBack: () => void
  }
  let { bucket, onBack }: Props = $props()
  let pendingConfirmation = $state<{
    title: string
    description: string
    confirmLabel: string
    destructive?: boolean
    action: () => Promise<void>
  } | null>(null)

  const versioningQuery = createQuery(() => ({
    queryKey: settingsKeys.versioning(bucket),
    queryFn: () => getVersioning(bucket),
  }))
  const encryptionQuery = createQuery(() => ({
    queryKey: settingsKeys.encryption(bucket),
    queryFn: () => getEncryption(bucket),
  }))
  const publicQuery = createQuery(() => ({
    queryKey: settingsKeys.publicAccess(bucket),
    queryFn: () => getPublicAccess(bucket),
  }))

  const versioningEnabled = $derived(!!versioningQuery.data?.enabled)
  const encryptionEnabled = $derived(!!encryptionQuery.data?.enabled)
  const publicRead = $derived(!!publicQuery.data?.read)
  const publicList = $derived(!!publicQuery.data?.list)

  const versioningMutation = createMutation(() => ({
    mutationFn: (enabled: boolean) => setVersioning(bucket, enabled),
    onSuccess: (_data, enabled) => {
      toast.success(enabled ? 'Versioning enabled' : 'Versioning disabled')
      queryClient.invalidateQueries({ queryKey: settingsKeys.versioning(bucket) })
      queryClient.invalidateQueries({ queryKey: bucketKeys.list() })
    },
  }))

  const encryptionMutation = createMutation(() => ({
    mutationFn: (enabled: boolean) => setEncryption(bucket, enabled),
    onSuccess: (_data, enabled) => {
      toast.success(enabled ? 'Default encryption enabled' : 'Default encryption disabled')
      queryClient.invalidateQueries({ queryKey: settingsKeys.encryption(bucket) })
      queryClient.invalidateQueries({ queryKey: bucketKeys.list() })
    },
  }))

  const publicMutation = createMutation(() => ({
    mutationFn: (next: { read: boolean; list: boolean }) => setPublicAccess(bucket, next.read, next.list),
    onSuccess: (_data, next) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.publicAccess(bucket) })
      toast.success(next.read !== publicRead ? (next.read ? 'Public read enabled' : 'Public read disabled') : (next.list ? 'Public listing enabled' : 'Public listing disabled'))
    },
  }))

  async function toggleVersioning() {
    const newState = !versioningEnabled
    if (versioningEnabled && !newState) {
      pendingConfirmation = {
        title: 'Disable versioning?',
        description: 'This will permanently delete all old versions. Only the latest version of each file will be kept. This cannot be undone.',
        confirmLabel: 'Disable versioning',
        destructive: true,
        action: () => applyVersioning(newState),
      }
      return
    }
    await applyVersioning(newState)
  }

  async function applyVersioning(newState: boolean) {
    try {
      await versioningMutation.mutateAsync(newState)
      pendingConfirmation = null
    } catch (err) {
      console.error('toggleVersioning failed:', err)
      toast.error(err instanceof ApiError ? err.message : 'Failed to update versioning')
    }
  }

  async function toggleEncryption() {
    const newState = !encryptionEnabled
    if (encryptionEnabled && !newState) {
      pendingConfirmation = {
        title: 'Disable default encryption?',
        description: 'New uploads will be stored unencrypted. Existing encrypted objects stay encrypted.',
        confirmLabel: 'Disable encryption',
        destructive: true,
        action: () => applyEncryption(newState),
      }
      return
    }
    await applyEncryption(newState)
  }

  async function applyEncryption(newState: boolean) {
    try {
      await encryptionMutation.mutateAsync(newState)
      pendingConfirmation = null
    } catch (err) {
      console.error('toggleEncryption failed:', err)
      toast.error(err instanceof ApiError ? err.message : 'Failed to update encryption')
    }
  }

  async function togglePublicRead() {
    const newState = !publicRead
    if (newState) {
      pendingConfirmation = {
        title: 'Enable public read?',
        description: 'Anyone with a URL to an object in this bucket can download it without credentials. Only enable if every object in the bucket is safe to share publicly.',
        confirmLabel: 'Enable public read',
        action: () => applyPublicAccess({ read: newState, list: publicList }),
      }
      return
    }
    await applyPublicAccess({ read: newState, list: publicList })
  }

  async function applyPublicAccess(next: { read: boolean; list: boolean }) {
    try {
      await publicMutation.mutateAsync(next)
      pendingConfirmation = null
    } catch (err) {
      console.error('togglePublicRead failed:', err)
      toast.error(err instanceof ApiError ? err.message : 'Failed to update public access')
    }
  }

  async function togglePublicList() {
    const newState = !publicList
    if (newState) {
      pendingConfirmation = {
        title: 'Enable public listing?',
        description: 'Anyone can list every object key in this bucket without credentials. Keys may reveal sensitive structure.',
        confirmLabel: 'Enable public listing',
        action: () => applyPublicAccess({ read: publicRead, list: newState }),
      }
      return
    }
    await applyPublicAccess({ read: publicRead, list: newState })
  }
</script>

<div class="flex flex-col gap-6 max-w-3xl">
  {#if versioningQuery.isError || encryptionQuery.isError || publicQuery.isError}
    <Callout type="danger">Failed to load bucket settings</Callout>
  {/if}

  {#if versioningEnabled && !versioningQuery.isPending}
    <Callout type="warning" title="Disabling versioning is destructive">
      Turning versioning off permanently deletes all non-current versions. Only the latest version of each object remains.
    </Callout>
  {/if}

  <div class="rounded-xl border border-neutral-200 bg-white dark:border-white/[0.07] dark:bg-white/[0.02]">
    <div class="border-b border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-500 dark:border-white/[0.06] dark:text-fg-dim"><span>Versioning</span></div>
    <div class="p-4">
      <div class="flex items-center justify-between gap-4 py-3">
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-medium text-black dark:text-fg">Versioning</span>
          <span class="text-[13px] text-muted-foreground">
            {#if versioningQuery.isPending}
              Loading...
            {:else if versioningEnabled}
              Every upload creates a new version. Deleted files become delete markers.
            {:else}
              Uploading a file overwrites the previous version.
            {/if}
          </span>
        </div>
        {#if !versioningQuery.isPending}
          <Listbox
            class="w-48 shrink-0"
            value={versioningEnabled ? 'enabled' : 'disabled'}
            options={[
              { value: 'enabled', label: 'Enabled' },
              { value: 'disabled', label: 'Disabled' },
            ]}
            onChange={() => toggleVersioning()}
            disabled={versioningMutation.isPending}
            aria-label="Versioning"
          />
        {/if}
      </div>
    </div>
  </div>

  <div class="rounded-xl border border-neutral-200 bg-white dark:border-white/[0.07] dark:bg-white/[0.02]">
    <div class="border-b border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-500 dark:border-white/[0.06] dark:text-fg-dim"><span>Default encryption</span></div>
    <div class="p-4">
      <div class="flex items-center justify-between gap-4 py-3">
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-medium text-black dark:text-fg">Default encryption (SSE-S3)</span>
          <span class="text-[13px] text-muted-foreground">
            {#if encryptionQuery.isPending}
              Loading...
            {:else if encryptionEnabled}
              New uploads are encrypted at rest with SSE-S3 (AES-256).
            {:else}
              New uploads are stored unencrypted unless the client sends SSE headers.
            {/if}
          </span>
        </div>
        {#if !encryptionQuery.isPending}
          <Listbox
            class="w-48 shrink-0"
            value={encryptionEnabled ? 'enabled' : 'disabled'}
            options={[
              { value: 'enabled', label: 'SSE-S3 (AES-256)' },
              { value: 'disabled', label: 'Disabled' },
            ]}
            onChange={() => toggleEncryption()}
            disabled={encryptionMutation.isPending}
            aria-label="Default encryption"
          />
        {/if}
      </div>
    </div>
  </div>

  <div class="rounded-xl border border-neutral-200 bg-white dark:border-white/[0.07] dark:bg-white/[0.02]">
    <div class="border-b border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-500 dark:border-white/[0.06] dark:text-fg-dim"><span>Public access</span></div>
    <div class="p-4">
      <div class="divide-y divide-neutral-200 dark:divide-white/[0.06]">
        <div class="flex items-center justify-between gap-4 py-3 pt-0">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium text-black dark:text-fg">Public read</span>
            <span class="text-[13px] text-muted-foreground">
              {#if publicQuery.isPending}
                Loading...
              {:else if publicRead}
                Anyone with an object URL can download it without credentials.
              {:else}
                Object downloads require a signed request.
              {/if}
            </span>
          </div>
          {#if !publicQuery.isPending}
            <Listbox
              class="w-48 shrink-0"
              value={publicRead ? 'public' : 'signed'}
              options={[
                { value: 'signed', label: 'Signed requests' },
                { value: 'public', label: 'Public' },
              ]}
              onChange={() => togglePublicRead()}
              disabled={publicMutation.isPending}
              aria-label="Public read"
            />
          {/if}
        </div>

        <div class="flex items-center justify-between gap-4 py-3 pb-0">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium text-black dark:text-fg">Public listing</span>
            <span class="text-[13px] text-muted-foreground">
              {#if publicQuery.isPending}
                Loading...
              {:else if publicList}
                Anyone can list every object key in this bucket without credentials.
              {:else}
                Listing the bucket requires a signed request.
              {/if}
            </span>
          </div>
          {#if !publicQuery.isPending}
            <Listbox
              class="w-48 shrink-0"
              value={publicList ? 'public' : 'signed'}
              options={[
                { value: 'signed', label: 'Signed requests' },
                { value: 'public', label: 'Public' },
              ]}
              onChange={() => togglePublicList()}
              disabled={publicMutation.isPending}
              aria-label="Public listing"
            />
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

{#if pendingConfirmation}
  <ConfirmDialog
    open
    title={pendingConfirmation.title}
    description={pendingConfirmation.description}
    confirmLabel={pendingConfirmation.confirmLabel}
    confirmVariant={pendingConfirmation.destructive ? 'destructive' : 'highlighted'}
    loading={versioningMutation.isPending || encryptionMutation.isPending || publicMutation.isPending}
    onClose={() => (pendingConfirmation = null)}
    onConfirm={pendingConfirmation.action}
  />
{/if}
