<script>
	import LucideIcon from '$lib/components/LucideIcon.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { activeSection, navItemsStore, projectConfig } from '../../../../stores/ui';
	import { slide } from 'svelte/transition';

	// We might keep these props for fallback compatibility, but we will mostly ignore title and use "Menu"
	export let title = 'Menu';
	export let iconName = 'layers';
	export let isMinimized = false;
	export let isRightSidebar = false;
	export let toggleMinimize = () => {
		isMinimized = !isMinimized;
	};
	export let useLucideIcon = false;

	$: project = $page.params.project;

	const navigateTo = (section) => {
		activeSection.set(section);
		goto(`/${project}/${section}`);
	};

	const navigateToCustom = (id) => {
		activeSection.set(id);
		goto(`/${project}/custom/${id}`);
	};

	// Local state to track which section is currently expanded in the accordion
	let expandedSectionId = $activeSection;

	// Keep expandedSectionId in sync if activeSection changes externally
	// We use a variable to track the last seen activeSection to only update when it ACTUALLY changes
	let lastActiveSection = $activeSection;
	$: if ($activeSection !== lastActiveSection) {
		lastActiveSection = $activeSection;
		expandedSectionId = $activeSection;
	}

	const handleSectionClick = (item) => {
		if (expandedSectionId === item.id) {
			// If already expanded, collapse it
			expandedSectionId = null;
		} else {
			// Expand it and navigate
			expandedSectionId = item.id;
			if ($activeSection !== item.id) {
				if (item.isCustom) {
					navigateToCustom(item.id);
				} else {
					navigateTo(item.id);
				}
			}
		}
	};
</script>

{#if isRightSidebar}
	<div
		class="fixed left-0 top-40 z-[99999999999999] flex h-[50%] w-[350px] max-w-[90vw] flex-col overflow-y-auto rounded-xl border-r border-white/10 bg-[#0f1115]/60 shadow-2xl backdrop-blur-xl transition-transform duration-500 {isMinimized
			? '-translate-x-full'
			: 'translate-x-0'}"
	>
		<!-- Minimal Glass Header -->

		<!-- Close button -->
		<button
			on:click={toggleMinimize}
			class="ml-auto mt-2 rounded-full px-6 py-0 text-white/70 transition-colors hover:text-white"
		>
			<LucideIcon name="chevron-left" size={20} />
		</button>

		<!-- Sleek scrollable content area -->
		<div class="scrollbar-hide flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-6 pt-2">
			{#if $navItemsStore && $navItemsStore.length > 0}
				{#each $navItemsStore as item}
					<div
						class="mb-1 flex shrink-0 flex-col overflow-hidden rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm"
					>
						<button
							class="flex w-full items-center justify-between p-4 transition-colors {expandedSectionId ===
							item.id
								? 'bg-white/10 text-white'
								: 'text-white/70 hover:bg-white/5 hover:text-white'}"
							on:click={() => handleSectionClick(item)}
						>
							<div class="flex items-center gap-3">
								<div class="opacity-80">
									{#if item.isCustom}
										<LucideIcon name={item.icon || 'layers'} size={18} color="currentColor" />
									{:else}
										<Icon name={item.icon} size={18} color="currentColor" />
									{/if}
								</div>
								<span class="text-sm font-medium tracking-wide">{item.label}</span>
							</div>

							<div
								class="transition-transform duration-300 {expandedSectionId === item.id
									? 'rotate-180'
									: ''}"
							>
								<LucideIcon name="chevron-down" size={16} />
							</div>
						</button>

						{#if expandedSectionId === item.id && $$slots.default}
							<div class="px-2 pb-2 pt-1" transition:slide={{ duration: 300 }}>
								<slot />
							</div>
						{/if}
					</div>
				{/each}
			{:else}
				<slot />
			{/if}
		</div>
	</div>

	<!-- Overlay toggle button if minimized -->
	{#if isMinimized}
		<button
			on:click={toggleMinimize}
			class="fixed left-4 top-1/2 z-[99999999999998] -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0f1115]/60 p-3 text-white shadow-xl backdrop-blur-2xl transition-all hover:scale-105 hover:bg-white/10"
		>
			<LucideIcon name="menu" size={24} />
		</button>
	{/if}
{:else}
	<!-- Fallback wrapper if not right sidebar (for layout structure) -->
	<div class="left-panel-wrapper">
		<slot name="fallback" />
	</div>
{/if}

<style>
	.scrollbar-hide::-webkit-scrollbar {
		width: 4px;
	}
	.scrollbar-hide::-webkit-scrollbar-track {
		background: transparent;
	}
	.scrollbar-hide::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 10px;
	}
	.scrollbar-hide::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
