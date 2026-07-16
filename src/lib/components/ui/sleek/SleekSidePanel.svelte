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
	export let toggleMinimize = () => { isMinimized = !isMinimized; };
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
	<div class="fixed top-0 left-0 h-full w-[350px] max-w-[90vw] z-[99999999999999] bg-[#0f1115]/60 backdrop-blur-xl border-r border-white/10 shadow-2xl flex flex-col transition-transform duration-500 {isMinimized ? '-translate-x-full' : 'translate-x-0'}">
		<!-- Minimal Glass Header -->
		<div class="flex items-center justify-between px-6 py-8 border-b border-white/10">
			<div class="flex items-center gap-3">
				{#if $projectConfig?.projectLogo}
					<img src={$projectConfig.projectLogo} alt="Logo" class="max-h-[3rem] w-auto object-contain" />
				{:else}
					<div class="p-2 rounded-xl bg-white/5 border border-white/10 text-white">
						<LucideIcon name="menu" size={20} color="currentColor" />
					</div>
					<h2 class="text-lg font-medium text-white tracking-wide">Menu</h2>
				{/if}
			</div>
			<!-- Close button -->
			<button on:click={toggleMinimize} class="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
				<LucideIcon name="x" size={20} />
			</button>
		</div>

		<!-- Sleek scrollable content area -->
		<div class="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide flex flex-col gap-2">
			{#if $navItemsStore && $navItemsStore.length > 0}
				{#each $navItemsStore as item}
					<div class="flex flex-col mb-1 border border-white/5 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm shrink-0">
						<button 
							class="w-full flex items-center justify-between p-4 transition-colors {expandedSectionId === item.id ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'}"
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
								<span class="font-medium tracking-wide text-sm">{item.label}</span>
							</div>
							
							<div class="transition-transform duration-300 {expandedSectionId === item.id ? 'rotate-180' : ''}">
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
			class="fixed top-1/2 left-4 -translate-y-1/2 z-[99999999999998] p-3 rounded-2xl bg-[#0f1115]/60 backdrop-blur-2xl border border-white/10 text-white shadow-xl hover:bg-white/10 transition-all hover:scale-105"
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
