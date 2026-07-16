<script lang="js">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { projectConfig } from '../../../stores/ui';
	import * as Accordion from '$lib/components/ui/accordion';
	import minimizeBtn from '$lib/images/minimize-icon.svg';
	import maximizeBtn from '$lib/images/maximize-icon.svg';
	import Icon from '$lib/components/Icon.svelte';
	import SectionFallback from '$lib/components/SectionFallback.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import SleekSidePanel from '$lib/components/ui/sleek/SleekSidePanel.svelte';
	import SleekAccordion from '$lib/components/ui/sleek/SleekAccordion.svelte';
	import SleekButton from '$lib/components/ui/sleek/SleekButton.svelte';

	let mounted = false;
	const isExteriorMinimized = writable(false);

	$: config = $projectConfig;
	$: exteriorConfig = config?.exterior?.categories ?? [];
	$: isSectionVisible = config?.sectionVisibility?.exterior;

	// Extract folder path from image array
	function getFolderFromImages(images) {
		if (!images || images.length === 0) return '';
		const firstImage = images[0];
		// Remove the filename (e.g., "1.webp") and return the folder path
		const lastSlashIndex = firstImage.lastIndexOf('/');
		return lastSlashIndex !== -1 ? firstImage.substring(0, lastSlashIndex + 1) : '';
	}

	let currentCategory = null;

	$: currentCategoryImages = currentCategory?.images || null;
	$: currentCategoryName = currentCategory?.name || '';

	let placeholderImage = '';
	$: if (exteriorConfig && exteriorConfig.length > 0) {
		const firstCategory = exteriorConfig[0];
		const images = firstCategory.images || [];
		const startIndex = firstCategory.initialStartIndex || 1;
		placeholderImage = images[startIndex - 1] || images[0] || '';
	}

	let lastInitializedCategoryId = null;
	let viewersInitialized = false;

	// Track if viewer is ready to show
	let viewerReady = false;

	onMount(async () => {
		if (isSectionVisible && config) {
			mounted = true;

			if (exteriorConfig.length > 0) {
				currentCategory = exteriorConfig[0];
			}

			// Preload placeholder image
			if (placeholderImage) {
				const img = new Image();
				img.src = placeholderImage;
				await new Promise((resolve) => {
					img.onload = resolve;
					img.onerror = resolve;
				});
				console.log('[Exterior] Placeholder image preloaded');
			}

			try {
				console.log('[Exterior 360 Viewer] Initializing with config', exteriorConfig);

				// Wait for CI360 script to be available
				let attempts = 0;
				while (!window.CI360 && attempts < 50) {
					await new Promise((resolve) => setTimeout(resolve, 100));
					attempts++;
				}

				if (!window.CI360) {
					console.error('[Exterior 360 Viewer] CI360 script not loaded');
					return;
				}

				// Hide viewer initially to prevent glitch
				viewerReady = false;

				// Initialize all viewers after mount
				window.CI360.init();
				viewersInitialized = true;

				// Wait for initialization and images to load completely
				let loadedAttempts = 0;
				const initialViewerId = `${exteriorConfig[0].id}-viewer`;
				while (loadedAttempts < 100) {
					const viewers = window.CI360._viewers || [];
					const viewer = viewers.find((v) => v.id === initialViewerId);
					if (viewer && viewer.imagesLoaded) {
						break; // Images fully loaded!
					}
					await new Promise((resolve) => setTimeout(resolve, 100));
					loadedAttempts++;
				}

				// Set initial position for the first category
				if (currentCategory && exteriorConfig.length > 0) {
					const initialIndex = exteriorConfig[0].initialStartIndex
						? exteriorConfig[0].initialStartIndex - 1
						: 0;
					const viewerId = `${exteriorConfig[0].id}-viewer`;
					console.log(
						`[Exterior 360 Viewer] Setting initial position to ${initialIndex} for ${viewerId}`
					);

					if (window.CI360 && window.CI360.setActiveIndex) {
						window.CI360.setActiveIndex(viewerId, initialIndex);
						console.log(`[Exterior 360 Viewer] Position set to ${initialIndex}`);
					}
				}

				// Show viewer after position is set
				await new Promise((resolve) => setTimeout(resolve, 100));
				viewerReady = true;
				console.log('[Exterior 360 Viewer] Ready to display');
			} catch (error) {
				console.error('Error initializing exterior cloud:', error);
				viewerReady = true; // Show viewer even if there's an error
			}
		}
	});

	$: if (mounted && exteriorConfig.length > 0 && !currentCategory) {
		currentCategory = exteriorConfig[0];
	}

	async function switchCategory(category) {
		if (currentCategory?.id === category.id) return;
		currentCategory = category;

		// Wait for DOM to update, then initialize the newly visible viewer
		await new Promise((resolve) => setTimeout(resolve, 100));

		try {
			const viewerId = `${category.id}-viewer`;
			const initialIndex = category.initialStartIndex ? category.initialStartIndex - 1 : 0;

			console.log(
				`[Exterior 360 Viewer] Switching to ${category.name || category.id}, index: ${initialIndex}`
			);

			// Initialize the viewer
			if (window.CI360) {
				window.CI360.init();

				// Wait for initialization and images to load completely
				let loadedAttempts = 0;
				while (loadedAttempts < 100) {
					const viewers = window.CI360._viewers || [];
					const viewer = viewers.find((v) => v.id === viewerId);
					if (viewer && viewer.imagesLoaded) {
						break; // Images fully loaded!
					}
					await new Promise((resolve) => setTimeout(resolve, 100));
					loadedAttempts++;
				}

				// Set position
				if (window.CI360.setActiveIndex) {
					window.CI360.setActiveIndex(viewerId, initialIndex);
					console.log(`[Exterior 360 Viewer] Position set to ${initialIndex}`);
				}
			}
		} catch (error) {
			console.error('Error reinitializing exterior cloud:', error);
		}
	}

	function getCategoryLabel(category) {
		return category.name || category.id || 'Unnamed Category';
	}
</script>

<LoadingOverlay
	isVisible={!config || !viewerReady}
	variant={config && placeholderImage ? 'transparent' : 'default'}
>
	{#if config && placeholderImage && !viewerReady}
		<div class="absolute inset-0 z-[-1]">
			<img src={placeholderImage} alt="Loading..." class="w-full h-full object-cover" fetchpriority="high" decoding="async" />
			<div class="absolute inset-0 bg-black/20"></div>
		</div>
		<div class="flex flex-col items-center">
			<div
				class="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"
			></div>
			<p class="text-white text-sm font-medium tracking-widest uppercase">Initializing 360°</p>
		</div>
	{/if}
</LoadingOverlay>

{#if !config || (config && Object.keys(config).length === 0) || !isSectionVisible}
	<SectionFallback />
{:else}
	<!-- UI elements only show when viewer is ready -->
	{#if viewerReady}
		<SleekSidePanel 
			isRightSidebar={config?.navStyle === 'sidebar'} 
			title={$projectConfig?.sectionAliases?.exterior?.trim() || 'Exterior'}
			iconName="exterior"
			isMinimized={$isExteriorMinimized}
			toggleMinimize={() => $isExteriorMinimized = !$isExteriorMinimized}
		>
			<!-- SLEEK SIDEBAR CONTENT -->
			{#if exteriorConfig && exteriorConfig.length > 0}
				<SleekAccordion title="Exterior Views" isOpen={true}>
					{#each exteriorConfig as category}
						<SleekButton
							active={currentCategory?.id === category.id}
							onClick={() => switchCategory(category)}
						>
							{getCategoryLabel(category)}
						</SleekButton>
					{/each}
				</SleekAccordion>
			{:else}
				<p class="p-2 text-sm text-white/50">Loading categories...</p>
			{/if}

			<!-- THEME FALLBACK CONTENT -->
			<svelte:fragment slot="fallback">
				<div class="left-panel p-2">
					<div class="left-panel--header flex justify-between gap-[5rem]">
						<div class="left-title flex items-center font-bold">
							<Icon name="exterior" size={16} class="mr-2" />
							{$projectConfig?.sectionAliases?.exterior?.trim() || 'Exterior'}
						</div>
						<button
							on:click={() => {
								$isExteriorMinimized = !$isExteriorMinimized;
							}}
							class="ghost-btn close-btn border border-transparent !px-0 !py-0"
							id="minimize-toggle-exterior"
						>
							{#if !$isExteriorMinimized}
								<img id="ext-mm" src={minimizeBtn} alt="minimize" />
							{/if}
							{#if $isExteriorMinimized}
								<img id="ext-mx" src={maximizeBtn} alt="maximize" />
							{/if}
						</button>
					</div>

					<div class={!$isExteriorMinimized ? 'block' : 'hidden'}>
						<div class="pt-3">
							<div class="inner-btn-group">
								{#if exteriorConfig && exteriorConfig.length > 0}
									{#each exteriorConfig as category, index}
										<button
											class={currentCategory?.id === category.id
												? 'active inner-modal-btn'
												: 'inner-modal-btn'}
											id={category.id + '-ext'}
											on:click={() => switchCategory(category)}
										>
											{getCategoryLabel(category)}
										</button>
									{/each}
								{:else}
									<p class="p-2 text-sm text-gray-500">Loading categories...</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</svelte:fragment>
		</SleekSidePanel>
	{/if}

	<!-- 360 Viewer Container - Separate element for each category - Must be in DOM for initialization -->
	{#each exteriorConfig as category}
		{@const folder = getFolderFromImages(category.images || [])}
		<div
			id="{category.id}-viewer"
			class={viewerReady && currentCategory?.id === category.id
				? 'cloudimage-360 exterior-cloudi !absolute left-0 top-0 z-[10]'
				: 'cloudimage-360 exterior-cloudi invisible'}
			data-folder={folder}
			data-filename={'{index}.webp'}
			data-amount="24"
			data-keys="false"
			data-filters="blur:20"
			data-drag-speed="400"
			data-request-responsive-images="true"
			data-info="false"
			data-ratio="1"
		></div>
	{/each}

	{#if exteriorConfig.length === 0 && viewerReady}
		<div class="flex h-screen items-center justify-center">
			<p class="text-lg text-white">Loading exterior categories...</p>
		</div>
	{/if}
{/if}

<style>
	:global(.exterior-cloudi) {
		width: 100%;
		height: 100vh;
		background: #000;
	}

	.invisible {
		position: absolute !important;
		left: -9999px !important;
		visibility: hidden !important;
		pointer-events: none !important;
		opacity: 0 !important;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes fadeOut {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}
</style>
