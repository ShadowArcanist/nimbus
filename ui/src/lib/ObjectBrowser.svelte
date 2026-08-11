<script lang="ts">
  import { onMount } from 'svelte'
  import { createMutation, createQuery } from '@tanstack/svelte-query'
  import * as Table from '$lib/components/ui/table'
  import { Button } from '$lib/components/ui/button'
  import { Callout } from '$lib/components/ui/callout'
  import { ConfirmDialog } from '$lib/components/ui/confirm-dialog'
  import { Dialog } from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'
  import { Listbox } from '$lib/components/ui/listbox'
  import Folder from 'lucide-svelte/icons/folder'
  import FileIcon from 'lucide-svelte/icons/file'
  import Download from 'lucide-svelte/icons/download'
  import Upload from 'lucide-svelte/icons/upload'
  import Trash2 from 'lucide-svelte/icons/trash-2'
  import Share2 from 'lucide-svelte/icons/share-2'
  import Check from 'lucide-svelte/icons/check'
  import FolderPlus from 'lucide-svelte/icons/folder-plus'
  import FolderInput from 'lucide-svelte/icons/folder-input'
  import Pencil from 'lucide-svelte/icons/pencil'
  import History from 'lucide-svelte/icons/history'
  import List from 'lucide-svelte/icons/list'
  import Search from 'lucide-svelte/icons/search'
  import LayoutGrid from 'lucide-svelte/icons/layout-grid'
  import VersionHistory from './VersionHistory.svelte'
  import { toast } from '$lib/toast'
  import { bucketKeys, objectKeys, settingsKeys } from '$lib/api/keys'
  import { createFolder as createFolderApi, deleteObject as deleteObjectApi, listObjects, moveObject, presignObject, uploadObject } from '$lib/api/objects'
  import { listBuckets } from '$lib/api/buckets'
  import { getVersioning } from '$lib/api/settings'
  import { ApiError, encodeObjectKey } from '$lib/api/http'
  import { queryClient } from '$lib/query/client'

  interface Props {
    bucket: string
    onBack: () => void
    onPrefixChange?: (prefix: string, breadcrumbs: { label: string; prefix: string }[]) => void
  }
  let { bucket, onBack, onPrefixChange }: Props = $props()

  let prefix = $state('')
  let fileInput: HTMLInputElement | undefined = $state()
  let copiedKey = $state<string | null>(null)
  let shareMenuKey = $state<string | null>(null)
  let showCreateFolder = $state(false)
  let newFolderName = $state('')
  let shareMenuPos = $state({ top: 0, left: 0 })
  let versionKey = $state<string | null>(null)
  let pendingDelete = $state<{ key: string; kind: 'object' | 'folder' } | null>(null)
  let createFolderInput = $state<HTMLInputElement | null>(null)
  let renameFolderPrefix = $state<string | null>(null)
  let renameFolderName = $state('')
  let renameFolderInput = $state<HTMLInputElement | null>(null)
  let moveTarget = $state<{ key: string; kind: 'object' | 'folder' } | null>(null)
  let moveDestBucket = $state('')
  let moveDestFolder = $state('')
  let moveFolderInput = $state<HTMLInputElement | null>(null)

  $effect(() => {
    if (showCreateFolder && createFolderInput) {
      queueMicrotask(() => createFolderInput?.focus())
    }
  })

  $effect(() => {
    if (renameFolderPrefix && renameFolderInput) {
      queueMicrotask(() => renameFolderInput?.focus())
    }
  })

  $effect(() => {
    if (moveTarget && moveFolderInput) {
      queueMicrotask(() => moveFolderInput?.focus())
    }
  })

  const objectsQuery = createQuery(() => ({
    queryKey: objectKeys.list(bucket, prefix),
    queryFn: () => listObjects(bucket, prefix),
  }))

  const versioningQuery = createQuery(() => ({
    queryKey: settingsKeys.versioning(bucket),
    queryFn: () => getVersioning(bucket),
  }))

  const uploadMutation = createMutation(() => ({
    mutationFn: async (files: FileList) => {
      for (const file of Array.from(files)) {
        await uploadObject(bucket, `${prefix}${file.name}`, file)
      }
      return files.length
    },
    onSuccess: (count) => {
      toast.success(count === 1 ? 'File uploaded' : `${count} files uploaded`)
      if (fileInput) fileInput.value = ''
      queryClient.invalidateQueries({ queryKey: objectKeys.list(bucket, prefix) })
    },
  }))

  const deleteObjectMutation = createMutation(() => ({
    mutationFn: (key: string) => deleteObjectApi(bucket, key),
    onSuccess: (_data, key) => {
      toast.success(`"${displayName(key)}" deleted`)
      queryClient.invalidateQueries({ queryKey: objectKeys.list(bucket, prefix) })
    },
  }))

  const createFolderMutation = createMutation(() => ({
    mutationFn: (name: string) => createFolderApi(bucket, `${prefix}${name}`),
    onSuccess: (_data, name) => {
      toast.success(`Folder "${name}" created`)
      newFolderName = ''
      showCreateFolder = false
      queryClient.invalidateQueries({ queryKey: objectKeys.list(bucket, prefix) })
    },
  }))

  const bucketsQuery = createQuery(() => ({
    queryKey: bucketKeys.list(),
    queryFn: listBuckets,
  }))

  const renameFolderMutation = createMutation(() => ({
    mutationFn: ({ from, to }: { from: string; to: string }) => moveObject(bucket, from, to),
    onSuccess: (_data, { to }) => {
      toast.success(`Folder renamed to "${displayName(to)}"`)
      renameFolderPrefix = null
      renameFolderName = ''
      queryClient.invalidateQueries({ queryKey: objectKeys.list(bucket, prefix) })
    },
  }))

  const moveMutation = createMutation(() => ({
    mutationFn: ({ from, to, destBucket }: { from: string; to: string; destBucket?: string }) =>
      moveObject(bucket, from, to, destBucket),
    onSuccess: (_data, { to, destBucket }) => {
      toast.success(`Moved to "${destBucket ?? bucket}/${to}"`)
      moveTarget = null
      queryClient.invalidateQueries({ queryKey: objectKeys.list(bucket, prefix) })
      if (destBucket) {
        queryClient.invalidateQueries({ queryKey: [...objectKeys.all, 'list', destBucket] })
      }
    },
  }))

  const files = $derived(objectsQuery.data?.files ?? [])
  const prefixes = $derived(objectsQuery.data?.prefixes ?? [])

  let objectSearch = $state('')
  const filteredFiles = $derived(
    files.filter((f: { key: string }) =>
      displayName(f.key).toLowerCase().includes(objectSearch.trim().toLowerCase())
    )
  )
  const filteredPrefixes = $derived(
    prefixes.filter((p: string) =>
      displayName(p).toLowerCase().includes(objectSearch.trim().toLowerCase())
    )
  )
  const emptyPrefixes = $derived(new Set(objectsQuery.data?.emptyPrefixes ?? []))
  const versioningEnabled = $derived(!!versioningQuery.data?.enabled)

  const expiryOptions = [
    { label: '1 hour', seconds: 3600 },
    { label: '6 hours', seconds: 21600 },
    { label: '24 hours', seconds: 86400 },
    { label: '7 days', seconds: 604800 },
  ]


  function notifyPrefix() {
    onPrefixChange?.(prefix, breadcrumbs)
  }

  export function navigateTo(newPrefix: string) {
    prefix = newPrefix
    notifyPrefix()
  }

  export function goUp() {
    if (!prefix) {
      onBack()
      return
    }
    const trimmed = prefix.slice(0, -1)
    const lastSlash = trimmed.lastIndexOf('/')
    prefix = lastSlash >= 0 ? trimmed.slice(0, lastSlash + 1) : ''
    notifyPrefix()
  }

  function displayName(fullPath: string): string {
    const trimmed = fullPath.endsWith('/') ? fullPath.slice(0, -1) : fullPath
    const lastSlash = trimmed.lastIndexOf('/')
    return lastSlash >= 0 ? trimmed.slice(lastSlash + 1) : trimmed
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  let breadcrumbs = $derived.by(() => {
    const parts = prefix.split('/').filter(Boolean)
    const crumbs: { label: string; prefix: string }[] = [
      { label: bucket, prefix: '' },
    ]
    let acc = ''
    for (const part of parts) {
      acc += part + '/'
      crumbs.push({ label: part, prefix: acc })
    }
    return crumbs
  })

  function downloadUrl(key: string): string {
    return `/api/buckets/${encodeURIComponent(bucket)}/download/${encodeObjectKey(key)}`
  }

  async function handleUpload() {
    const inputFiles = fileInput?.files
    if (!inputFiles || inputFiles.length === 0) return
    const toastId = toast.loading(inputFiles.length === 1 ? `Uploading ${inputFiles[0].name}…` : `Uploading ${inputFiles.length} files…`)
    try {
      await uploadMutation.mutateAsync(inputFiles)
      toast.dismiss(toastId)
    } catch (err) {
      console.error('Upload failed:', err)
      toast.error(err instanceof Error ? err.message : 'Upload failed', { id: toastId })
      if (fileInput) fileInput.value = ''
    }
  }

  async function deleteObject(key: string, e: Event) {
    e.stopPropagation()
    pendingDelete = { key, kind: 'object' }
  }

  async function confirmPendingDelete() {
    if (!pendingDelete) return
    const { key, kind } = pendingDelete
    try {
      await deleteObjectMutation.mutateAsync(key)
      pendingDelete = null
    } catch (err) {
      console.error(kind === 'folder' ? 'deleteFolder failed:' : 'deleteObject failed:', err)
      toast.error(err instanceof ApiError ? err.message : kind === 'folder' ? 'Failed to delete folder' : 'Failed to connect to server')
    }
  }

  function toggleShareMenu(key: string, e: MouseEvent) {
    e.stopPropagation()
    if (shareMenuKey === key) {
      shareMenuKey = null
      return
    }
    const btn = e.currentTarget as HTMLElement
    const rect = btn.getBoundingClientRect()
    shareMenuPos = { top: rect.top, left: rect.right }
    shareMenuKey = key
  }

  async function shareObject(key: string, expires: number) {
    shareMenuKey = null
    try {
      const data = await presignObject(bucket, key, expires)
      await navigator.clipboard.writeText(data.url)
      copiedKey = key
      setTimeout(() => { copiedKey = null }, 2000)
      toast.success('Presigned URL copied to clipboard')
    } catch (err) {
      console.error('shareObject failed:', err)
      toast.error(err instanceof ApiError ? err.message : 'Failed to generate share link')
    }
  }

  async function createFolder() {
    const name = newFolderName.trim()
    if (!name) return
    try {
      await createFolderMutation.mutateAsync(name)
    } catch (err) {
      console.error('createFolder failed:', err)
      toast.error(err instanceof ApiError ? err.message : 'Failed to create folder')
    }
  }

  async function deleteFolder(folderPrefix: string, e: Event) {
    e.stopPropagation()
    pendingDelete = { key: folderPrefix, kind: 'folder' }
  }

  const bucketOptions = $derived(
    (bucketsQuery.data?.buckets ?? []).map((b) => ({ value: b.name, label: b.name }))
  )

  function openRenameFolder(folderPrefix: string, e: Event) {
    e.stopPropagation()
    renameFolderPrefix = folderPrefix
    renameFolderName = displayName(folderPrefix)
  }

  async function renameFolder() {
    if (!renameFolderPrefix) return
    const name = renameFolderName.trim()
    if (!name) return
    if (name.includes('/')) {
      toast.error('Folder name cannot contain "/"')
      return
    }
    if (name === displayName(renameFolderPrefix)) {
      renameFolderPrefix = null
      renameFolderName = ''
      return
    }
    try {
      await renameFolderMutation.mutateAsync({ from: renameFolderPrefix, to: `${prefix}${name}/` })
    } catch (err) {
      console.error('renameFolder failed:', err)
      toast.error(err instanceof ApiError ? err.message : 'Failed to rename folder')
    }
  }

  function openMove(key: string, kind: 'object' | 'folder', e: Event) {
    e.stopPropagation()
    moveTarget = { key, kind }
    moveDestBucket = bucket
    moveDestFolder = prefix
  }

  async function moveItem() {
    if (!moveTarget) return
    let destPrefix = moveDestFolder.trim().replace(/^\/+/, '')
    if (destPrefix && !destPrefix.endsWith('/')) destPrefix += '/'
    const from = moveTarget.key
    const to = moveTarget.kind === 'folder'
      ? `${destPrefix}${displayName(from)}/`
      : `${destPrefix}${displayName(from)}`
    if (moveTarget.kind === 'folder' && moveDestBucket === bucket && to.startsWith(from)) {
      toast.error('Cannot move a folder into itself')
      return
    }
    try {
      await moveMutation.mutateAsync({ from, to, destBucket: moveDestBucket === bucket ? undefined : moveDestBucket })
    } catch (err) {
      console.error('moveItem failed:', err)
      toast.error(err instanceof ApiError ? err.message : 'Failed to move')
    }
  }

  type ViewMode = 'list' | 'grid'
  let view = $state<ViewMode>(
    typeof localStorage !== 'undefined' && localStorage.getItem('objects-view') === 'grid' ? 'grid' : 'list'
  )
  function setView(mode: ViewMode) {
    view = mode
    localStorage.setItem('objects-view', mode)
  }

  function handleClickOutside() {
    if (shareMenuKey) shareMenuKey = null
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  })
</script>

<div class="flex flex-col gap-5">
  <!-- Page header -->
  <div class="flex items-center justify-between gap-4">
    <h1>{bucket}</h1>
    <div class="flex items-center gap-2">
      <input
        bind:this={fileInput}
        type="file"
        multiple
        class="hidden"
        onchange={handleUpload}
      />
      <Button variant="outline" onclick={() => (showCreateFolder = true)}>
        <FolderPlus class="size-4" /> New Folder
      </Button>
      <Button variant="highlighted" onclick={() => fileInput?.click()} disabled={uploadMutation.isPending}>
        <Upload class="size-4" /> {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
      </Button>
    </div>
  </div>

  {#if objectsQuery.isError}
    <Callout type="danger">{objectsQuery.error instanceof ApiError ? objectsQuery.error.message : 'Failed to load objects'}</Callout>
  {/if}

  <!-- Toolbar: search + view toggle -->
  <div class="flex items-center justify-between gap-3">
    <div class="relative w-full max-w-sm">
      <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 dark:text-fg-faint" />
      <input
        type="text"
        bind:value={objectSearch}
        placeholder="Search in this folder"
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

  {#if objectsQuery.isPending}
    <p class="text-sm text-muted-foreground">Loading...</p>
  {:else if files.length === 0 && prefixes.length === 0 && !objectsQuery.isError}
    <div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 py-16 text-center dark:border-white/[0.07]">
      <div class="icon-tile mb-1 size-10">
        <Folder class="size-5" />
      </div>
      <p class="text-sm font-medium text-black dark:text-white">This location is empty</p>
      <p class="text-sm text-muted-foreground">Upload a file or create a folder to get started.</p>
    </div>
  {:else if filteredFiles.length === 0 && filteredPrefixes.length === 0}
    <div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 py-16 text-center dark:border-white/[0.07]">
      <p class="text-sm font-medium text-black dark:text-white">No matches</p>
      <p class="text-sm text-muted-foreground">Nothing in this folder matches "{objectSearch}".</p>
    </div>
  {:else if view === 'list'}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Name</Table.Head>
          <Table.Head class="w-28">Size</Table.Head>
          <Table.Head class="w-48">Modified</Table.Head>
          <Table.Head class="w-24">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each filteredPrefixes as p}
          <Table.Row class="cursor-pointer" onclick={() => navigateTo(p)}>
            <Table.Cell>
              <span class="flex items-center gap-3">
                <span class="icon-tile"><Folder class="size-4" /></span>
                <span class="font-medium text-black dark:text-white">{displayName(p)}/</span>
              </span>
            </Table.Cell>
            <Table.Cell class="text-muted-foreground">-</Table.Cell>
            <Table.Cell class="text-muted-foreground">-</Table.Cell>
            <Table.Cell>
              <span class="flex items-center gap-1">
                <button
                  class="icon-btn-cool"
                  onclick={(e) => openRenameFolder(p, e)}
                  title="Rename folder"
                >
                  <Pencil class="size-4" />
                </button>
                <button
                  class="icon-btn-cool"
                  onclick={(e) => openMove(p, 'folder', e)}
                  title="Move"
                >
                  <FolderInput class="size-4" />
                </button>
                {#if emptyPrefixes.has(p)}
                  <button
                    class="icon-btn-cool hover:text-red-600 dark:hover:text-red-400"
                    onclick={(e) => deleteFolder(p, e)}
                    title="Delete empty folder"
                  >
                    <Trash2 class="size-4" />
                  </button>
                {/if}
              </span>
            </Table.Cell>
          </Table.Row>
        {/each}
        {#each filteredFiles as file}
          <Table.Row>
            <Table.Cell>
              <span class="flex items-center gap-3">
                <span class="icon-tile"><FileIcon class="size-4" /></span>
                <span class="font-medium text-black dark:text-white">{displayName(file.key)}</span>
              </span>
            </Table.Cell>
            <Table.Cell class="text-muted-foreground">{formatSize(file.size)}</Table.Cell>
            <Table.Cell class="text-muted-foreground">{formatDate(file.lastModified)}</Table.Cell>
            <Table.Cell class="w-24">
              <span class="flex items-center gap-1">
                {#if versioningEnabled}
                  <button
                    class="icon-btn-cool"
                    onclick={(e) => { e.stopPropagation(); versionKey = versionKey === file.key ? null : file.key }}
                    title="Version history"
                  >
                    <History class="size-4" />
                  </button>
                {/if}
                <button
                  class="icon-btn-cool"
                  onclick={(e) => toggleShareMenu(file.key, e)}
                  title="Copy presigned URL"
                >
                  {#if copiedKey === file.key}
                    <Check class="size-4 text-success" />
                  {:else}
                    <Share2 class="size-4" />
                  {/if}
                </button>
                <a href={downloadUrl(file.key)} class="icon-btn-cool" onclick={(e) => e.stopPropagation()} title="Download">
                  <Download class="size-4" />
                </a>
                <button
                  class="icon-btn-cool"
                  onclick={(e) => openMove(file.key, 'object', e)}
                  title="Move"
                >
                  <FolderInput class="size-4" />
                </button>
                <button
                  class="icon-btn-cool hover:text-red-600 dark:hover:text-red-400"
                  onclick={(e) => deleteObject(file.key, e)}
                  title="Delete"
                >
                  <Trash2 class="size-4" />
                </button>
              </span>
            </Table.Cell>
          </Table.Row>
          {#if versionKey === file.key}
            <Table.Row>
              <Table.Cell colspan={4} class="p-0">
                <div class="p-2">
                  <VersionHistory
                    {bucket}
                    objectKey={file.key}
                    onClose={() => (versionKey = null)}
                    onVersionDeleted={() => queryClient.invalidateQueries({ queryKey: objectKeys.list(bucket, prefix) })}
                  />
                </div>
              </Table.Cell>
            </Table.Row>
          {/if}
        {/each}
      </Table.Body>
    </Table.Root>
  {:else}
    <!-- Grid view -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each filteredPrefixes as p}
        <div
          role="button"
          tabindex="0"
          onclick={() => navigateTo(p)}
          onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo(p) } }}
          class="group flex min-h-28 cursor-pointer flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 dark:border-white/[0.07] dark:bg-[#0b0b0b] dark:hover:border-white/[0.14] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <div class="flex items-start gap-3">
            <span class="icon-tile"><Folder class="size-4" /></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-black dark:text-white">{displayName(p)}/</p>
              <p class="mt-0.5 truncate text-[13px] text-muted-foreground">Folder</p>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-end gap-0.5">
            <button
              class="icon-btn-cool size-7"
              onclick={(e) => openRenameFolder(p, e)}
              title="Rename folder"
            >
              <Pencil class="size-4" />
            </button>
            <button
              class="icon-btn-cool size-7"
              onclick={(e) => openMove(p, 'folder', e)}
              title="Move"
            >
              <FolderInput class="size-4" />
            </button>
            {#if emptyPrefixes.has(p)}
              <button
                class="icon-btn-cool size-7 hover:text-red-600 dark:hover:text-red-400"
                onclick={(e) => deleteFolder(p, e)}
                title="Delete empty folder"
              >
                <Trash2 class="size-4" />
              </button>
            {/if}
          </div>
        </div>
      {/each}
      {#each filteredFiles as file}
        <div
          class="flex min-h-28 flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 dark:border-white/[0.07] dark:bg-[#0b0b0b] dark:hover:border-white/[0.14]"
        >
          <div class="flex items-start gap-3">
            <span class="icon-tile"><FileIcon class="size-4" /></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-black dark:text-white">{displayName(file.key)}</p>
              <p class="mt-0.5 truncate text-[13px] text-muted-foreground">{formatSize(file.size)} &middot; {formatDate(file.lastModified)}</p>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-end gap-0.5">
            {#if versioningEnabled}
              <button
                class="icon-btn-cool size-7"
                onclick={(e) => { e.stopPropagation(); versionKey = versionKey === file.key ? null : file.key }}
                title="Version history"
              >
                <History class="size-4" />
              </button>
            {/if}
            <button
              class="icon-btn-cool size-7"
              onclick={(e) => toggleShareMenu(file.key, e)}
              title="Copy presigned URL"
            >
              {#if copiedKey === file.key}
                <Check class="size-4 text-success" />
              {:else}
                <Share2 class="size-4" />
              {/if}
            </button>
            <a href={downloadUrl(file.key)} class="icon-btn-cool size-7" onclick={(e) => e.stopPropagation()} title="Download">
              <Download class="size-4" />
            </a>
            <button
              class="icon-btn-cool size-7"
              onclick={(e) => openMove(file.key, 'object', e)}
              title="Move"
            >
              <FolderInput class="size-4" />
            </button>
            <button
              class="icon-btn-cool size-7 hover:text-red-600 dark:hover:text-red-400"
              onclick={(e) => deleteObject(file.key, e)}
              title="Delete"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
        </div>
      {/each}
    </div>
    {#if versionKey}
      <VersionHistory
        {bucket}
        objectKey={versionKey}
        onClose={() => (versionKey = null)}
        onVersionDeleted={() => queryClient.invalidateQueries({ queryKey: objectKeys.list(bucket, prefix) })}
      />
    {/if}
  {/if}
</div>


<Dialog
  open={showCreateFolder}
  title="Create folder"
  description="Create an empty folder marker in the current location."
  loading={createFolderMutation.isPending}
  onClose={() => { showCreateFolder = false; newFolderName = '' }}
>
  <form id="create-folder-form" onsubmit={(e) => { e.preventDefault(); createFolder() }} class="flex flex-col gap-1.5">
    <label for="folder-name" class="text-[15px] font-normal text-neutral-800 dark:text-neutral-200">Folder name</label>
    <Input
      bind:ref={createFolderInput}
      id="folder-name"
      type="text"
      bind:value={newFolderName}
      placeholder="folder-name"
      class=""
      disabled={createFolderMutation.isPending}
    />
  </form>
  {#snippet footer()}
    <Button type="button" variant="default" disabled={createFolderMutation.isPending} onclick={() => { showCreateFolder = false; newFolderName = '' }}>
      Cancel
    </Button>
    <Button type="submit" form="create-folder-form" variant="highlighted" disabled={createFolderMutation.isPending || !newFolderName.trim()}>
      {createFolderMutation.isPending ? 'Creating…' : 'Create folder'}
    </Button>
  {/snippet}
</Dialog>

<Dialog
  open={renameFolderPrefix !== null}
  title="Rename folder"
  description="Rename this folder and move every object under it."
  loading={renameFolderMutation.isPending}
  onClose={() => { renameFolderPrefix = null; renameFolderName = '' }}
>
  <form id="rename-folder-form" onsubmit={(e) => { e.preventDefault(); renameFolder() }} class="flex flex-col gap-1.5">
    <label for="rename-folder-name" class="text-[15px] font-normal text-neutral-800 dark:text-neutral-200">Folder name</label>
    <Input
      bind:ref={renameFolderInput}
      id="rename-folder-name"
      type="text"
      bind:value={renameFolderName}
      placeholder="folder-name"
      class=""
      disabled={renameFolderMutation.isPending}
    />
  </form>
  {#snippet footer()}
    <Button type="button" variant="default" disabled={renameFolderMutation.isPending} onclick={() => { renameFolderPrefix = null; renameFolderName = '' }}>
      Cancel
    </Button>
    <Button type="submit" form="rename-folder-form" variant="highlighted" disabled={renameFolderMutation.isPending || !renameFolderName.trim()}>
      {renameFolderMutation.isPending ? 'Renaming…' : 'Rename folder'}
    </Button>
  {/snippet}
</Dialog>

{#if moveTarget}
  <Dialog
    open
    title="Move"
    description={moveTarget.kind === 'folder'
      ? `Move folder "${displayName(moveTarget.key)}" and everything under it.`
      : `Move "${displayName(moveTarget.key)}".`}
    loading={moveMutation.isPending}
    onClose={() => (moveTarget = null)}
  >
    <form id="move-form" onsubmit={(e) => { e.preventDefault(); moveItem() }} class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <label for="move-dest-bucket" class="text-[15px] font-normal text-neutral-800 dark:text-neutral-200">Destination bucket</label>
        <Listbox
          id="move-dest-bucket"
          value={moveDestBucket}
          options={bucketOptions}
          onChange={(value) => (moveDestBucket = value)}
          disabled={moveMutation.isPending}
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="move-dest-folder" class="text-[15px] font-normal text-neutral-800 dark:text-neutral-200">Destination folder</label>
        <Input
          bind:ref={moveFolderInput}
          id="move-dest-folder"
          type="text"
          bind:value={moveDestFolder}
          placeholder="folder/subfolder/ - empty for root"
          class=""
          disabled={moveMutation.isPending}
        />
      </div>
    </form>
    {#snippet footer()}
      <Button type="button" variant="default" disabled={moveMutation.isPending} onclick={() => (moveTarget = null)}>
        Cancel
      </Button>
      <Button type="submit" form="move-form" variant="highlighted" disabled={moveMutation.isPending}>
        {moveMutation.isPending ? 'Moving…' : 'Move'}
      </Button>
    {/snippet}
  </Dialog>
{/if}

{#if shareMenuKey}
  <div
    class="fixed z-50 min-w-[8rem] rounded-xl border border-neutral-200 bg-white p-1 shadow-[0_12px_32px_rgba(0,0,0,0.35)] dark:border-white/[0.08] dark:bg-[#101010]"
    style="top: {shareMenuPos.top}px; left: {shareMenuPos.left}px; transform: translate(-100%, -100%);"
    role="menu"
  >
    {#each expiryOptions as opt}
      <button
        class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-fg-dim dark:hover:bg-white/[0.06]"
        onclick={() => shareObject(shareMenuKey!, opt.seconds)}
      >
        {opt.label}
      </button>
    {/each}
  </div>
{/if}

{#if pendingDelete}
  <ConfirmDialog
    open
    title={pendingDelete.kind === 'folder' ? 'Delete empty folder?' : 'Delete object?'}
    description={pendingDelete.kind === 'folder'
      ? `This will remove the empty folder marker \"${displayName(pendingDelete.key)}\".`
      : `This will delete \"${displayName(pendingDelete.key)}\" from this bucket.`}
    confirmLabel={pendingDelete.kind === 'folder' ? 'Delete folder' : 'Delete object'}
    confirmVariant="destructive"
    loading={deleteObjectMutation.isPending}
    onClose={() => (pendingDelete = null)}
    onConfirm={confirmPendingDelete}
  />
{/if}
