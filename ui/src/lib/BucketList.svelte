<script lang="ts">
  import { createMutation, createQuery } from '@tanstack/svelte-query'
  import * as Table from '$lib/components/ui/table'
  import { Button } from '$lib/components/ui/button'
  import { Callout } from '$lib/components/ui/callout'
  import { ConfirmDialog } from '$lib/components/ui/confirm-dialog'
  import { Dialog } from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'
  import Database from 'lucide-svelte/icons/database'
  import Plus from 'lucide-svelte/icons/plus'
  import Search from 'lucide-svelte/icons/search'
  import Trash2 from 'lucide-svelte/icons/trash-2'
  import Settings from 'lucide-svelte/icons/settings'
  import List from 'lucide-svelte/icons/list'
  import LayoutGrid from 'lucide-svelte/icons/layout-grid'
  import { toast } from '$lib/toast'
  import { bucketKeys } from '$lib/api/keys'
  import { createBucket as createBucketApi, deleteBucket as deleteBucketApi, listBuckets } from '$lib/api/buckets'
  import { ApiError } from '$lib/api/http'
  import { queryClient } from '$lib/query/client'

  interface Props {
    onSelect: (bucket: string) => void
    onSettings: (bucket: string) => void
  }
  let { onSelect, onSettings }: Props = $props()

  let showCreate = $state(false)
  let newBucketName = $state('')
  let bucketToDelete = $state<string | null>(null)
  let createBucketInput = $state<HTMLInputElement | null>(null)

  $effect(() => {
    if (showCreate && createBucketInput) {
      queueMicrotask(() => createBucketInput?.focus())
    }
  })

  const bucketsQuery = createQuery(() => ({
    queryKey: bucketKeys.list(),
    queryFn: listBuckets,
  }))

  const createBucketMutation = createMutation(() => ({
    mutationFn: createBucketApi,
    onSuccess: (_data, name) => {
      toast.success(`Bucket "${name}" created`)
      newBucketName = ''
      showCreate = false
      queryClient.invalidateQueries({ queryKey: bucketKeys.list() })
    },
  }))

  const deleteBucketMutation = createMutation(() => ({
    mutationFn: deleteBucketApi,
    onSuccess: (_data, name) => {
      toast.success(`Bucket "${name}" deleted`)
      queryClient.invalidateQueries({ queryKey: bucketKeys.list() })
    },
  }))


  async function createBucket() {
    const name = newBucketName.trim()
    if (!name) return
    try {
      await createBucketMutation.mutateAsync(name)
    } catch (err) {
      console.error('createBucket failed:', err)
      toast.error(err instanceof ApiError ? err.message : 'Failed to connect to server')
    }
  }

  async function deleteBucket(name: string, e: Event) {
    e.stopPropagation()
    bucketToDelete = name
  }

  async function confirmDeleteBucket() {
    if (!bucketToDelete) return
    const name = bucketToDelete
    try {
      await deleteBucketMutation.mutateAsync(name)
      bucketToDelete = null
    } catch (err) {
      console.error('deleteBucket failed:', err)
      toast.error(err instanceof ApiError ? err.message : 'Failed to connect to server')
    }
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  let search = $state('')
  const filteredBuckets = $derived(
    (bucketsQuery.data?.buckets ?? []).filter((b) =>
      b.name.toLowerCase().includes(search.trim().toLowerCase())
    )
  )

  type ViewMode = 'list' | 'grid'
  let view = $state<ViewMode>(
    typeof localStorage !== 'undefined' && localStorage.getItem('buckets-view') === 'grid' ? 'grid' : 'list'
  )
  function setView(mode: ViewMode) {
    view = mode
    localStorage.setItem('buckets-view', mode)
  }

  function formatDateShort(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return iso
    }
  }
</script>

<div class="flex flex-col gap-5">
  <!-- Page header -->
  <div class="flex items-center justify-between gap-4">
    <h1>Buckets</h1>
    <Button variant="highlighted" onclick={() => (showCreate = true)}>
      <Plus class="size-4" /> New bucket
    </Button>
  </div>

  {#if bucketsQuery.isError}
    <Callout type="danger">{bucketsQuery.error instanceof ApiError ? bucketsQuery.error.message : 'Failed to load buckets'}</Callout>
  {/if}

  <!-- Toolbar -->
  <div class="flex items-center justify-between gap-3">
    <div class="relative w-full max-w-sm">
      <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 dark:text-fg-faint" />
      <input
        id="bucket-search"
        type="text"
        bind:value={search}
        placeholder="Search buckets"
        class="search-cool"
      />
    </div>
    <div class="inline-flex shrink-0 items-center overflow-hidden rounded-lg border border-neutral-200 dark:border-white/[0.08]" role="group" aria-label="View mode">
      <button
        type="button"
        onclick={() => setView('list')}
        class={`grid h-10 w-10 place-items-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
          view === 'list'
            ? 'bg-gradient-to-b from-coollabs-100 to-coollabs-200 text-white'
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-black dark:text-fg-faint dark:hover:bg-white/[0.06] dark:hover:text-fg'
        }`}
        aria-pressed={view === 'list'}
        title="List view"
      >
        <List class="size-4" />
      </button>
      <button
        type="button"
        onclick={() => setView('grid')}
        class={`grid h-10 w-10 place-items-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
          view === 'grid'
            ? 'bg-gradient-to-b from-coollabs-100 to-coollabs-200 text-white'
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-black dark:text-fg-faint dark:hover:bg-white/[0.06] dark:hover:text-fg'
        }`}
        aria-pressed={view === 'grid'}
        title="Grid view"
      >
        <LayoutGrid class="size-4" />
      </button>
    </div>
  </div>

  {#if bucketsQuery.isPending}
    <p class="text-sm text-muted-foreground">Loading...</p>
  {:else if (bucketsQuery.data?.buckets ?? []).length === 0 && !bucketsQuery.isError}
    <div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 py-16 text-center dark:border-white/[0.07]">
      <div class="icon-tile mb-1 size-10">
        <Database class="size-5" />
      </div>
      <p class="text-sm font-medium text-black dark:text-white">No buckets yet</p>
      <p class="text-sm text-muted-foreground">Create your first bucket to get started.</p>
    </div>
  {:else if filteredBuckets.length === 0}
    <div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 py-16 text-center dark:border-white/[0.07]">
      <p class="text-sm font-medium text-black dark:text-white">No matching buckets</p>
      <p class="text-sm text-muted-foreground">No buckets match "{search}".</p>
    </div>
  {:else if view === 'list'}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Bucket</Table.Head>
          <Table.Head>Versioning</Table.Head>
          <Table.Head>Encryption</Table.Head>
          <Table.Head>Created</Table.Head>
          <Table.Head class="w-24">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each filteredBuckets as bucket}
          <Table.Row class="cursor-pointer" onclick={() => onSelect(bucket.name)}>
            <Table.Cell>
              <span class="flex items-center gap-3">
                <span class="icon-tile"><Database class="size-4" /></span>
                <span class="font-medium text-black dark:text-white">{bucket.name}</span>
              </span>
            </Table.Cell>
            <Table.Cell>
              {#if bucket.versioning}
                <span class="status-badge"><span class="status-dot bg-success"></span>Enabled</span>
              {:else}
                <span class="status-badge"><span class="status-dot bg-neutral-400 dark:bg-neutral-500"></span>Disabled</span>
              {/if}
            </Table.Cell>
            <Table.Cell>
              {#if bucket.encryption}
                <span class="status-badge"><span class="status-dot bg-success"></span>Enabled</span>
              {:else}
                <span class="status-badge"><span class="status-dot bg-neutral-400 dark:bg-neutral-500"></span>Disabled</span>
              {/if}
            </Table.Cell>
            <Table.Cell class="text-muted-foreground">{formatDate(bucket.createdAt)}</Table.Cell>
            <Table.Cell class="w-20">
              <div class="flex items-center gap-1">
                <button
                  class="icon-btn-cool"
                  onclick={(e: Event) => { e.stopPropagation(); onSettings(bucket.name) }}
                  title="Bucket settings"
                >
                  <Settings class="size-4" />
                </button>
                <button
                  class="icon-btn-cool hover:text-red-600 dark:hover:text-red-400"
                  onclick={(e: Event) => deleteBucket(bucket.name, e)}
                  title="Delete bucket"
                >
                  <Trash2 class="size-4" />
                </button>
              </div>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {:else}
    <!-- Grid view -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each filteredBuckets as bucket}
        <div
          role="button"
          tabindex="0"
          onclick={() => onSelect(bucket.name)}
          onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(bucket.name) } }}
          class="group flex min-h-28 cursor-pointer flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 dark:border-white/[0.07] dark:bg-[#0b0b0b] dark:hover:border-white/[0.14] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <div class="flex items-start gap-3">
            <span class="icon-tile"><Database class="size-4" /></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-black dark:text-white">{bucket.name}</p>
              <p class="mt-0.5 truncate text-[13px] text-muted-foreground">Created {formatDateShort(bucket.createdAt)}</p>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between gap-2">
            <p class="min-w-0 truncate text-xs text-neutral-500 dark:text-fg-faint">
              {bucket.versioning ? 'Versioned' : 'Unversioned'} &middot; {bucket.encryption ? 'Encrypted' : 'Unencrypted'}
            </p>
            <div class="flex shrink-0 items-center gap-0.5">
              <button
                class="icon-btn-cool size-7"
                onclick={(e: Event) => { e.stopPropagation(); onSettings(bucket.name) }}
                title="Bucket settings"
              >
                <Settings class="size-4" />
              </button>
              <button
                class="icon-btn-cool size-7 hover:text-red-600 dark:hover:text-red-400"
                onclick={(e: Event) => deleteBucket(bucket.name, e)}
                title="Delete bucket"
              >
                <Trash2 class="size-4" />
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>


<Dialog
  open={showCreate}
  title="Create bucket"
  description="Choose a unique bucket name for your objects."
  loading={createBucketMutation.isPending}
  onClose={() => { showCreate = false; newBucketName = '' }}
>
  <form id="create-bucket-form" onsubmit={(e) => { e.preventDefault(); createBucket() }} class="flex flex-col gap-1.5">
    <label for="bucket-name" class="text-[15px] font-normal text-neutral-800 dark:text-neutral-200">Bucket name</label>
    <Input
      bind:ref={createBucketInput}
      id="bucket-name"
      type="text"
      bind:value={newBucketName}
      placeholder="bucket-name"
      class=""
      disabled={createBucketMutation.isPending}
    />
  </form>
  {#snippet footer()}
    <Button type="button" variant="default" disabled={createBucketMutation.isPending} onclick={() => { showCreate = false; newBucketName = '' }}>
      Cancel
    </Button>
    <Button type="submit" form="create-bucket-form" variant="highlighted" disabled={createBucketMutation.isPending || !newBucketName.trim()}>
      {createBucketMutation.isPending ? 'Creating…' : 'Create bucket'}
    </Button>
  {/snippet}
</Dialog>

<ConfirmDialog
  open={bucketToDelete !== null}
  title="Delete bucket?"
  description={`This will delete bucket \"${bucketToDelete ?? ''}\". The bucket must be empty before it can be removed.`}
  confirmLabel="Delete bucket"
  confirmVariant="destructive"
  confirmationText={bucketToDelete ?? undefined}
  confirmationLabel="Bucket name"
  loading={deleteBucketMutation.isPending}
  onClose={() => (bucketToDelete = null)}
  onConfirm={confirmDeleteBucket}
/>
