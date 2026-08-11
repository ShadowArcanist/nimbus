<script lang="ts">
  import { onMount } from "svelte";
  import { createMutation, createQuery } from "@tanstack/svelte-query";
  import Login from "$lib/Login.svelte";
  import BucketList from "$lib/BucketList.svelte";
  import ObjectBrowser from "$lib/ObjectBrowser.svelte";
  import BucketSettings from "$lib/BucketSettings.svelte";
  import Box from "lucide-svelte/icons/box";
  import LogOut from "lucide-svelte/icons/log-out";
  import Search from "lucide-svelte/icons/search";
  import Database from "lucide-svelte/icons/database";
  import PanelLeft from "lucide-svelte/icons/panel-left";
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
  import Check from "lucide-svelte/icons/check";
  import SettingsIcon from "lucide-svelte/icons/settings";
  import FolderOpen from "lucide-svelte/icons/folder-open";
  import Sun from "lucide-svelte/icons/sun";
  import Moon from "lucide-svelte/icons/moon";
  import Monitor from "lucide-svelte/icons/monitor";
  import UserIcon from "lucide-svelte/icons/user";
  import { Sonner } from "$lib/components/ui/sonner";
  import { Dialog } from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { toast } from "$lib/toast";
  import { checkAuth, logout } from "$lib/api/auth";
  import { authKeys, bucketKeys } from "$lib/api/keys";
  import { listBuckets } from "$lib/api/buckets";
  import { queryClient } from "$lib/query/client";

  type ThemeMode = "light" | "system" | "dark";

  const authQuery = createQuery(() => ({
    queryKey: authKeys.check(),
    queryFn: checkAuth,
    retry: false,
  }));
  const logoutMutation = createMutation(() => ({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  }));

  let authenticatedOverride = $state<boolean | null>(null);
  let collapsed = $state(false);
  let selectedBucket = $state<string | null>(null);
  let currentView = $state<"objects" | "settings">("objects");
  let objectBrowserRef = $state<ObjectBrowser | null>(null);
  let currentPrefix = $state("");
  let currentBreadcrumbs = $state<{ label: string; prefix: string }[]>([]);
  let themeMode = $state<ThemeMode>("system");
  let isDark = $state(true);
  let pendingPrefix = $state<string | null>(null);
  let userMenuOpen = $state(false);
  let userMenuRef = $state<HTMLDivElement | null>(null);
  let appearanceOpen = $state(false);

  // Command palette
  let searchOpen = $state(false);
  let searchQuery = $state("");
  let searchSelected = $state(0);
  let searchInputEl = $state<HTMLInputElement | null>(null);

  // Breadcrumb jump menus
  let crumbMenu = $state<null | "bucket" | "view">(null);

  // Profile (client-side: name + avatar stored in localStorage)
  let profileName = $state(
    typeof localStorage !== "undefined" ? (localStorage.getItem("profile-name") ?? "Admin") : "Admin"
  );
  let profileAvatar = $state<string | null>(
    typeof localStorage !== "undefined" ? localStorage.getItem("profile-avatar") : null
  );
  let showProfile = $state(false);
  let nameDraft = $state("");
  let avatarDraft = $state<string | null>(null);
  let avatarInputEl = $state<HTMLInputElement | null>(null);

  const profileInitial = $derived((profileName.trim()[0] ?? "A").toUpperCase());

  function openProfile() {
    userMenuOpen = false;
    nameDraft = profileName;
    avatarDraft = profileAvatar;
    showProfile = true;
  }

  function handleAvatarFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      avatarDraft = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function saveProfile() {
    const name = nameDraft.trim() || "Admin";
    profileName = name;
    profileAvatar = avatarDraft;
    localStorage.setItem("profile-name", name);
    if (avatarDraft) {
      localStorage.setItem("profile-avatar", avatarDraft);
    } else {
      localStorage.removeItem("profile-avatar");
    }
    showProfile = false;
    toast.success("Profile updated");
  }

  const paletteBucketsQuery = createQuery(() => ({
    queryKey: bucketKeys.list(),
    queryFn: listBuckets,
    enabled: searchOpen || crumbMenu === "bucket",
  }));

  const paletteResults = $derived(
    (paletteBucketsQuery.data?.buckets ?? [])
      .filter((b) => b.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      .slice(0, 8)
  );

  function openSearch() {
    searchOpen = true;
    searchQuery = "";
    searchSelected = 0;
    requestAnimationFrame(() => searchInputEl?.focus());
  }

  function closeSearch() {
    searchOpen = false;
  }

  function pickResult(name: string) {
    closeSearch();
    selectBucket(name);
  }

  function handlePaletteKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      searchSelected = Math.min(searchSelected + 1, paletteResults.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      searchSelected = Math.max(searchSelected - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = paletteResults[searchSelected];
      if (hit) pickResult(hit.name);
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      if (!searchOpen) openSearch();
    }
  }

  const themeOptions: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: "light", label: "Light", icon: Sun },
    { mode: "system", label: "System", icon: Monitor },
    { mode: "dark", label: "Dark", icon: Moon },
  ];

  $effect(() => {
    if (objectBrowserRef && pendingPrefix) {
      objectBrowserRef.navigateTo(pendingPrefix);
      pendingPrefix = null;
    }
  });

  function applyHash() {
    const hash = window.location.hash.slice(1) || "/";
    if (hash === "/") {
      selectedBucket = null;
      currentView = "objects";
      currentPrefix = "";
      currentBreadcrumbs = [];
    } else {
      const parts = hash.slice(1).split("/"); // remove leading /
      const bucket = decodeURIComponent(parts[0]);
      const rest = parts.slice(1).join("/");
      selectedBucket = bucket;
      if (rest === "settings") {
        currentView = "settings";
        currentPrefix = "";
        currentBreadcrumbs = [];
      } else {
        currentView = "objects";
        if (rest) {
          if (objectBrowserRef) {
            objectBrowserRef.navigateTo(rest);
          } else {
            pendingPrefix = rest;
          }
        }
      }
    }
  }

  function updateHash() {
    if (!selectedBucket) {
      window.location.hash = "/";
    } else if (currentPrefix) {
      window.location.hash = `/${encodeURIComponent(selectedBucket)}/${currentPrefix}`;
    } else {
      window.location.hash = `/${encodeURIComponent(selectedBucket)}`;
    }
  }

  onMount(() => {
    collapsed = localStorage.getItem("sidebar-collapsed") === "true";
    const savedTheme = localStorage.getItem("theme");
    themeMode = isThemeMode(savedTheme) ? savedTheme : "system";
    applyTheme(themeMode, false);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (themeMode === "system") {
        applyTheme("system", false);
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    window.addEventListener("hashchange", applyHash);
    if (window.location.hash && window.location.hash !== "#/") {
      applyHash();
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuOpen && userMenuRef && !userMenuRef.contains(e.target as Node)) {
        userMenuOpen = false;
      }
      if (crumbMenu && !(e.target as HTMLElement | null)?.closest?.("[data-crumb-menu]")) {
        crumbMenu = null;
      }
    };
    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("hashchange", applyHash);
      window.removeEventListener("mousedown", handleClickOutside);
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  });

  function handleLogin() {
    authenticatedOverride = true;
    queryClient.invalidateQueries({ queryKey: authKeys.all });
  }

  async function handleLogout() {
    userMenuOpen = false;
    await logoutMutation.mutateAsync();
    authenticatedOverride = false;
    selectedBucket = null;
    currentView = "objects";
    currentPrefix = "";
    currentBreadcrumbs = [];
  }

  function isThemeMode(value: string | null): value is ThemeMode {
    return value === "light" || value === "system" || value === "dark";
  }

  function applyTheme(mode: ThemeMode, persist = true) {
    themeMode = mode;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    isDark = mode === "dark" || (mode === "system" && systemDark);
    document.documentElement.classList.toggle("dark", isDark);
    if (persist) {
      localStorage.setItem("theme", mode);
    }
  }


  function toggleCollapsed() {
    collapsed = !collapsed;
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }

  function selectBucket(name: string) {
    selectedBucket = name;
    currentView = "objects";
    currentPrefix = "";
    currentBreadcrumbs = [];
    updateHash();
  }

  function goToSettings(name: string) {
    selectedBucket = name;
    currentView = "settings";
    currentPrefix = "";
    currentBreadcrumbs = [];
    window.location.hash = `/${encodeURIComponent(name)}/settings`;
  }

  function goHome() {
    selectedBucket = null;
    currentView = "objects";
    currentPrefix = "";
    currentBreadcrumbs = [];
    updateHash();
  }

  function handlePrefixChange(p: string, crumbs: { label: string; prefix: string }[]) {
    currentPrefix = p;
    currentBreadcrumbs = crumbs;
    updateHash();
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if authQuery.isPending && authenticatedOverride === null}
  <!-- loading -->
{:else if !(authenticatedOverride ?? authQuery.isSuccess)}
  <Login onLogin={handleLogin} />
{:else}
  <div class="flex h-screen bg-background text-foreground">
    <nav
      class="flex shrink-0 flex-col bg-sidebar-background transition-[width] duration-200"
      class:w-60={!collapsed}
      class:w-16={collapsed}
      style="border-right: 1px solid var(--cool-sidebar-border);"
    >
      <!-- Brand row -->
      <div
        class="flex h-[60px] shrink-0 items-center gap-2 overflow-hidden px-5"
        class:justify-center={collapsed}
        class:px-0={collapsed}
      >
        {#if !collapsed}
          <span class="flex items-baseline gap-1.5">
            <span class="whitespace-nowrap text-[15px] font-bold tracking-tight text-black dark:text-white">Nimbus</span>
            <span class="whitespace-nowrap text-[11px] font-medium text-neutral-400 dark:text-fg-faint">v{__APP_VERSION__}</span>
          </span>
        {:else}
          <span class="text-[15px] font-bold tracking-tight text-black dark:text-white">N</span>
        {/if}
      </div>

      <!-- Search trigger -->
      <div class="shrink-0 px-3 pb-2" class:px-2={collapsed}>
        <button
          type="button"
          onclick={openSearch}
          class="flex h-9 w-full items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-400 transition-colors hover:border-neutral-300 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-fg-faint dark:hover:border-white/[0.14] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          class:justify-center={collapsed}
          class:px-0={collapsed}
          title="Search buckets"
        >
          <Search class="size-4 shrink-0" />
          {#if !collapsed}
            <span class="flex-1 whitespace-nowrap text-left">Search</span>
            <kbd class="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-fg-faint">/</kbd>
          {/if}
        </button>
      </div>

      <!-- Nav -->
      <div class="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-2" class:px-2={collapsed}>
        {#if !collapsed}
          <p class="mb-1 px-2.5 text-xs font-medium text-neutral-400 dark:text-[#7a7a84]">Storage</p>
        {/if}
        <button
          onclick={goHome}
          class="menu-item w-full menu-item-active"
          class:justify-center={collapsed}
          class:px-0={collapsed}
          title="Buckets"
        >
          <Box class="size-[18px] shrink-0 opacity-90" />
          {#if !collapsed}<span class="whitespace-nowrap">Buckets</span>{/if}
        </button>
      </div>

      <!-- Bottom: user pill + collapse -->
      <div class={`flex shrink-0 gap-1.5 p-3 ${collapsed ? "flex-col items-center justify-center" : "items-center"}`}>
        <div class={`relative min-w-0 ${collapsed ? "" : "flex-1"}`} bind:this={userMenuRef}>
          <button
            type="button"
            onclick={() => { userMenuOpen = !userMenuOpen; appearanceOpen = false; }}
            class={`flex items-center rounded-full border border-neutral-200 bg-neutral-50 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-fg dark:hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              collapsed ? "size-9 justify-center p-0" : "h-9 w-full gap-2 pl-1.5 pr-2"
            }`}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            title="Account"
          >
            {#if profileAvatar}
              <img src={profileAvatar} alt={profileName} class="size-6 shrink-0 rounded-full object-cover" />
            {:else}
              <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-coollabs-100 to-coollabs-200 text-[11px] font-semibold text-white">{profileInitial}</span>
            {/if}
            {#if !collapsed}
              <span class="min-w-0 flex-1 truncate text-left">{profileName}</span>
              <ChevronDown class="size-3.5 shrink-0 text-neutral-400 dark:text-fg-faint" />
            {/if}
          </button>

          {#if userMenuOpen}
            <div
              class="absolute bottom-11 left-0 z-50 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)] dark:border-white/[0.08] dark:bg-[#101010]"
              role="menu"
            >
              <!-- Account header -->
              <div class="flex items-center gap-2.5 border-b border-neutral-100 px-2.5 pb-2.5 pt-1.5 dark:border-white/[0.06]">
                {#if profileAvatar}
                  <img src={profileAvatar} alt={profileName} class="size-8 shrink-0 rounded-full object-cover" />
                {:else}
                  <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-coollabs-100 to-coollabs-200 text-xs font-semibold text-white">{profileInitial}</span>
                {/if}
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-black dark:text-white">{profileName}</p>
                  <p class="truncate text-xs text-neutral-400 dark:text-fg-faint">Local account</p>
                </div>
              </div>
              <button
                type="button"
                onclick={openProfile}
                class="mt-1 flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-fg-dim dark:hover:bg-white/[0.06] dark:hover:text-white"
                role="menuitem"
              >
                <UserIcon class="size-4 shrink-0" />
                Profile
              </button>
              <button
                type="button"
                onclick={() => (appearanceOpen = !appearanceOpen)}
                class="flex h-9 w-full items-center justify-between gap-2.5 rounded-lg px-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-fg-dim dark:hover:bg-white/[0.06] dark:hover:text-white"
                aria-expanded={appearanceOpen}
              >
                <span class="flex items-center gap-2.5">
                  <Monitor class="size-4 shrink-0 opacity-80" />
                  Appearance
                </span>
                <ChevronDown
                  class={`size-3.5 shrink-0 text-neutral-400 transition-transform dark:text-fg-faint ${appearanceOpen ? "rotate-180" : ""}`}
                />
              </button>
              {#if appearanceOpen}
                <div class="mx-1 grid gap-0.5 pb-1 pl-6" role="group" aria-label="Theme">
                  {#each themeOptions as option}
                    <button
                      type="button"
                      onclick={() => applyTheme(option.mode)}
                      class="flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-xs text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-fg-dim dark:hover:bg-white/[0.06] dark:hover:text-white"
                      aria-pressed={themeMode === option.mode}
                    >
                      <span>{option.label}</span>
                      {#if themeMode === option.mode}
                        <Check class="size-3.5 shrink-0 text-accent" />
                      {/if}
                    </button>
                  {/each}
                </div>
              {/if}
              <button
                type="button"
                onclick={handleLogout}
                class="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-fg-dim dark:hover:bg-white/[0.06] dark:hover:text-white"
                role="menuitem"
              >
                <LogOut class="size-4 shrink-0" />
                Sign out
              </button>
            </div>
          {/if}
        </div>

        <button
          type="button"
          onclick={toggleCollapsed}
          class="icon-btn-cool size-9 rounded-lg"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          <PanelLeft class="size-4" />
        </button>
      </div>
    </nav>

    <main class="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <!-- Topbar: breadcrumb -->
      <header
        class="flex h-[60px] shrink-0 items-center gap-1.5 px-6"
        style="border-bottom: 1px solid var(--cool-border);"
      >
        <nav aria-label="Breadcrumb" class="min-w-0">
          <ol class="flex items-center gap-1.5 text-sm font-medium">
            <li class="inline-flex items-center gap-1.5">
              {#if selectedBucket}
                <button
                  type="button"
                  class="shrink-0 rounded-sm text-neutral-500 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent dark:text-[#a8a8b0] dark:hover:text-white"
                  onclick={goHome}>Buckets</button
                >
              {:else}
                <span class="shrink-0 text-black dark:text-white" aria-current="page">Buckets</span>
              {/if}
            </li>
            {#if selectedBucket}
              <li class="inline-flex items-center text-neutral-300 dark:text-fg-faint" aria-hidden="true">/</li>

              <!-- Bucket segment + bucket switcher -->
              <li class="relative inline-flex items-center gap-0.5" data-crumb-menu>
                <button
                  type="button"
                  class="shrink-0 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent {currentView === 'objects' && currentBreadcrumbs.length <= 1
                    ? 'text-black dark:text-white'
                    : 'text-neutral-500 hover:text-black dark:text-[#a8a8b0] dark:hover:text-white'}"
                  aria-haspopup="menu"
                  aria-expanded={crumbMenu === "bucket"}
                  onclick={() => (crumbMenu = crumbMenu === "bucket" ? null : "bucket")}
                >{selectedBucket}</button>
                <button
                  type="button"
                  class="grid size-5 shrink-0 place-items-center rounded border-0 bg-transparent text-neutral-400 transition-colors hover:text-black dark:text-fg-faint dark:hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  aria-label="Switch bucket"
                  aria-haspopup="menu"
                  aria-expanded={crumbMenu === "bucket"}
                  onclick={() => (crumbMenu = crumbMenu === "bucket" ? null : "bucket")}
                >
                  <ChevronsUpDown class="size-3" />
                </button>
                {#if crumbMenu === "bucket"}
                  <div
                    class="absolute left-0 top-full z-50 mt-2 max-h-72 w-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)] dark:border-white/[0.08] dark:bg-[#101010]"
                    role="menu"
                  >
                    {#if paletteBucketsQuery.isPending}
                      <p class="px-2.5 py-2 text-sm text-muted-foreground">Loading...</p>
                    {:else}
                      {#each paletteBucketsQuery.data?.buckets ?? [] as b}
                        <button
                          type="button"
                          role="menuitem"
                          onclick={() => { crumbMenu = null; selectBucket(b.name); }}
                          class="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-fg-dim dark:hover:bg-white/[0.06] dark:hover:text-white"
                        >
                          <Database class="size-4 shrink-0 opacity-70" />
                          <span class="min-w-0 flex-1 truncate text-left">{b.name}</span>
                          {#if b.name === selectedBucket}
                            <Check class="size-4 shrink-0 text-accent" />
                          {/if}
                        </button>
                      {/each}
                    {/if}
                  </div>
                {/if}
              </li>

              <li class="inline-flex items-center text-neutral-300 dark:text-fg-faint" aria-hidden="true">/</li>

              <!-- View segment + view switcher -->
              <li class="relative inline-flex items-center gap-0.5" data-crumb-menu>
                <button
                  type="button"
                  class="shrink-0 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent {currentBreadcrumbs.length > 1 && currentView === 'objects'
                    ? 'text-neutral-500 hover:text-black dark:text-[#a8a8b0] dark:hover:text-white'
                    : 'text-black dark:text-white'}"
                  aria-haspopup="menu"
                  aria-expanded={crumbMenu === "view"}
                  onclick={() => (crumbMenu = crumbMenu === "view" ? null : "view")}
                >{currentView === "settings" ? "Settings" : "Objects"}</button>
                <button
                  type="button"
                  class="grid size-5 shrink-0 place-items-center rounded border-0 bg-transparent text-neutral-400 transition-colors hover:text-black dark:text-fg-faint dark:hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  aria-label="Switch view"
                  aria-haspopup="menu"
                  aria-expanded={crumbMenu === "view"}
                  onclick={() => (crumbMenu = crumbMenu === "view" ? null : "view")}
                >
                  <ChevronsUpDown class="size-3" />
                </button>
                {#if crumbMenu === "view"}
                  <div
                    class="absolute left-0 top-full z-50 mt-2 w-44 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)] dark:border-white/[0.08] dark:bg-[#101010]"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onclick={() => { crumbMenu = null; selectBucket(selectedBucket!); }}
                      class="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-fg-dim dark:hover:bg-white/[0.06] dark:hover:text-white"
                    >
                      <FolderOpen class="size-4 shrink-0 opacity-70" />
                      <span class="flex-1 text-left">Objects</span>
                      {#if currentView === "objects"}
                        <Check class="size-4 shrink-0 text-accent" />
                      {/if}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onclick={() => { crumbMenu = null; goToSettings(selectedBucket!); }}
                      class="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black dark:text-fg-dim dark:hover:bg-white/[0.06] dark:hover:text-white"
                    >
                      <SettingsIcon class="size-4 shrink-0 opacity-70" />
                      <span class="flex-1 text-left">Settings</span>
                      {#if currentView === "settings"}
                        <Check class="size-4 shrink-0 text-accent" />
                      {/if}
                    </button>
                  </div>
                {/if}
              </li>

              <!-- Folder path (objects view only, beyond bucket root) -->
              {#if currentView === "objects" && currentBreadcrumbs.length > 1}
                {#each currentBreadcrumbs.slice(1) as crumb, i}
                  <li class="inline-flex items-center text-neutral-300 dark:text-fg-faint" aria-hidden="true">/</li>
                  {#if i < currentBreadcrumbs.length - 2}
                    <li class="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        class="shrink-0 rounded-sm text-neutral-500 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent dark:text-[#a8a8b0] dark:hover:text-white"
                        onclick={() => objectBrowserRef?.navigateTo(crumb.prefix)}
                      >{crumb.label}</button>
                    </li>
                  {:else}
                    <li class="inline-flex items-center gap-1.5">
                      <span class="shrink-0 text-black dark:text-white" aria-current="page">{crumb.label}</span>
                    </li>
                  {/if}
                {/each}
              {/if}
            {/if}
          </ol>
        </nav>
      </header>

      <!-- Scrollable content -->
      <div class="flex-1 overflow-auto">
        <div class="mx-auto w-full max-w-[1320px] px-6 py-8 lg:px-10">
          {#if selectedBucket && currentView === "settings"}
            <BucketSettings
              bucket={selectedBucket}
              onBack={() => selectBucket(selectedBucket!)}
            />
          {:else if selectedBucket}
            <ObjectBrowser
              bind:this={objectBrowserRef}
              bucket={selectedBucket}
              onBack={goHome}
              onPrefixChange={handlePrefixChange}
            />
          {:else}
            <BucketList onSelect={selectBucket} onSettings={goToSettings} />
          {/if}
        </div>
      </div>
    </main>
  </div>
  <Dialog
    open={showProfile}
    title="Profile"
    onClose={() => (showProfile = false)}
  >
    <div class="flex flex-col gap-5">
      <!-- Avatar row -->
      <div class="flex items-center gap-4">
        {#if avatarDraft}
          <img src={avatarDraft} alt="Avatar preview" class="size-14 shrink-0 rounded-full object-cover" />
        {:else}
          <span class="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-coollabs-100 to-coollabs-200 text-lg font-semibold text-white">
            {(nameDraft.trim()[0] ?? "A").toUpperCase()}
          </span>
        {/if}
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <Button type="button" variant="default" size="sm" onclick={() => avatarInputEl?.click()}>
              Upload image
            </Button>
            {#if avatarDraft}
              <Button type="button" variant="ghost" size="sm" onclick={() => (avatarDraft = null)}>
                Remove
              </Button>
            {/if}
          </div>
          <p class="text-xs text-neutral-400 dark:text-fg-faint">PNG or JPG, up to 10 MB. Stored in this browser.</p>
        </div>
        <input
          bind:this={avatarInputEl}
          type="file"
          accept="image/*"
          class="hidden"
          onchange={handleAvatarFile}
        />
      </div>

      <!-- Name field -->
      <div class="flex flex-col gap-1.5">
        <label for="profile-name" class="text-[15px] font-normal text-neutral-800 dark:text-neutral-200">Name</label>
        <Input
          id="profile-name"
          type="text"
          bind:value={nameDraft}
          placeholder="Your name"
        />
      </div>
    </div>
    {#snippet footer()}
      <Button type="button" variant="default" onclick={() => (showProfile = false)}>Cancel</Button>
      <Button type="button" variant="highlighted" onclick={saveProfile} disabled={!nameDraft.trim()}>
        Save
      </Button>
    {/snippet}
  </Dialog>

  {#if searchOpen}
    <!-- Command palette -->
    <button
      type="button"
      class="fixed inset-0 z-50 cursor-default bg-black/60"
      aria-label="Close search"
      onclick={closeSearch}
    ></button>
    <div class="fixed left-1/2 top-24 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        class="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.55)] dark:border-white/[0.08] dark:bg-[#101010]"
      >
        <div class="flex items-center gap-2.5 border-b border-neutral-100 px-4 py-3 dark:border-white/[0.06]">
          <Search class="size-4 shrink-0 text-neutral-400 dark:text-fg-faint" />
          <input
            bind:this={searchInputEl}
            bind:value={searchQuery}
            oninput={() => (searchSelected = 0)}
            onkeydown={handlePaletteKeydown}
            type="text"
            placeholder="Search buckets..."
            class="h-8 w-full bg-transparent text-[15px] text-black outline-none placeholder:text-neutral-400 dark:text-fg dark:placeholder:text-fg-faint"
          />
          <kbd class="shrink-0 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-fg-faint">ESC</kbd>
        </div>
        <div class="max-h-80 overflow-y-auto p-2">
          {#if paletteBucketsQuery.isPending}
            <p class="px-2.5 py-3 text-sm text-muted-foreground">Loading...</p>
          {:else if paletteResults.length === 0}
            <p class="px-2.5 py-3 text-sm text-muted-foreground">
              {searchQuery.trim() ? `No buckets match "${searchQuery.trim()}".` : "No buckets yet."}
            </p>
          {:else}
            <p class="px-2.5 pb-1 pt-1.5 text-xs font-medium text-neutral-400 dark:text-[#7a7a84]">Buckets</p>
            {#each paletteResults as result, i}
              <button
                type="button"
                onclick={() => pickResult(result.name)}
                onmouseenter={() => (searchSelected = i)}
                class={`flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm transition-colors ${
                  i === searchSelected
                    ? "bg-neutral-100 text-black dark:bg-white/[0.06] dark:text-white"
                    : "text-neutral-600 dark:text-fg-dim"
                }`}
              >
                <span class="icon-tile size-7"><Database class="size-3.5" /></span>
                <span class="min-w-0 flex-1 truncate font-medium">{result.name}</span>
                {#if i === searchSelected}
                  <kbd class="shrink-0 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-fg-faint">↵</kbd>
                {/if}
              </button>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}
  <Sonner theme={isDark ? "dark" : "light"} />
{/if}
