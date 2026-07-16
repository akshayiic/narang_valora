<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import SleekSidePanel from '$lib/components/ui/sleek/SleekSidePanel.svelte';
	import SectionFallback from '$lib/components/SectionFallback.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';

	export let config;
	export let sectionId;
	export let imagesConfig; // this should be config.overviewImages or config.exterior

	let modeInitialized = false;
	const isMinimized = writable(false);
	$: isSectionVisible = config?.sectionVisibility?.[sectionId];

	function getFolderFromImages(images) {
		if (!images || images.length === 0) return '';
		const firstImage = images[0];
		const lastSlashIndex = firstImage.lastIndexOf('/');
		return lastSlashIndex !== -1 ? firstImage.substring(0, lastSlashIndex + 1) : '';
	}

	let dayFolder = '';
	let eveningFolder = '';
	let placeholderImage = '';
	let isDay = true;
	let viewerReady = false;

	$: if (config && imagesConfig) {
		if (!modeInitialized && imagesConfig.defaultMode) {
			isDay = imagesConfig.defaultMode === 'day';
			modeInitialized = true;
		}
		dayFolder = getFolderFromImages(imagesConfig.day || []);
		eveningFolder = getFolderFromImages(imagesConfig.evening || []);

		const currentModeImages = isDay ? (imagesConfig.day || []) : (imagesConfig.evening || []);
		const startIndex = isDay ? (imagesConfig.initialStartIndexDay || 1) : (imagesConfig.initialStartIndexNight || 1);
		placeholderImage = currentModeImages[startIndex - 1] || currentModeImages[0] || '';
	}

	onMount(async () => {
		if (placeholderImage) {
			const img = new Image();
			img.src = placeholderImage;
			await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
		}
		if (isSectionVisible && config) {
			try {
				if (!window.CI360) return;
				viewerReady = false;
				window.CI360.init();
				const viewerIds = ['day-viewer', 'evening-viewer'];
				for (const vid of viewerIds) {
					if (vid === 'evening-viewer' && !eveningFolder) continue;
					let loadedAttempts = 0;
					while (loadedAttempts < 100) {
						const viewers = window.CI360._viewers || [];
						const viewer = viewers.find((v) => v.id === vid);
						if (viewer && viewer.imagesLoaded) break;
						await new Promise((resolve) => setTimeout(resolve, 100));
						loadedAttempts++;
					}
					const initialIndex = vid === 'day-viewer'
						? (imagesConfig.initialStartIndexDay || 1) - 1
						: (imagesConfig.initialStartIndexNight || 1) - 1;
					if (window.CI360 && window.CI360.setActiveIndex) {
						window.CI360.setActiveIndex(vid, initialIndex);
					}
				}
				viewerReady = true;
			} catch (error) {
				viewerReady = true;
			}
		}
	});

	async function toggleDayNight() {
		isDay = !isDay;
		await new Promise((resolve) => setTimeout(resolve, 100));
		try {
			const viewerId = isDay ? 'day-viewer' : 'evening-viewer';
			const initialIndex = isDay ? (imagesConfig.initialStartIndexDay || 1) - 1 : (imagesConfig.initialStartIndexNight || 1) - 1;
			if (window.CI360) {
				window.CI360.init();
				let loadedAttempts = 0;
				while (loadedAttempts < 100) {
					const viewers = window.CI360._viewers || [];
					const viewer = viewers.find((v) => v.id === viewerId);
					if (viewer && viewer.imagesLoaded) break;
					await new Promise((resolve) => setTimeout(resolve, 100));
					loadedAttempts++;
				}
				if (window.CI360.setActiveIndex) {
					await new Promise((resolve) => setTimeout(resolve, 50));
					window.CI360.setActiveIndex(viewerId, initialIndex);
				}
			}
		} catch (error) {}
	}
</script>

<LoadingOverlay isVisible={!config || !viewerReady} variant={config && placeholderImage ? 'transparent' : 'default'}>
	{#if config && placeholderImage && !viewerReady}
		<div class="absolute inset-0 z-[-1]">
			<img src={placeholderImage} alt="Loading..." class="w-full h-full object-cover" fetchpriority="high" decoding="async" />
			<div class="absolute inset-0 bg-black/20"></div>
		</div>
		<div class="flex flex-col items-center">
			<div class="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
			<p class="text-white text-sm font-medium tracking-widest uppercase">Initializing 360°</p>
		</div>
	{/if}
</LoadingOverlay>

{#if !config || Object.keys(config).length === 0 || !isSectionVisible}
	<SectionFallback />
{:else}
	<SleekSidePanel 
		isRightSidebar={true} 
		title={config?.sectionAliases?.[sectionId]?.trim() || sectionId}
		iconName={sectionId}
		isMinimized={$isMinimized}
		toggleMinimize={() => $isMinimized = !$isMinimized}
	>
		<!-- Cloud360 views don't have categories, just show basic text or let the user drag -->
		<div class="p-4 text-white/70 text-sm">
			<p>Drag the image to look around.</p>
		</div>
	</SleekSidePanel>
{/if}

{#if config && isSectionVisible}
	<div
		id="day-viewer"
		class={viewerReady && isDay ? 'cloudimage-360 !absolute left-0 top-0 z-[10]' : 'cloudimage-360 invisible'}
		data-folder={dayFolder}
		data-filename={'{index}.webp'}
		data-amount="24"
		data-keys="false"
		data-drag-speed="400"
		data-spin-reverse={imagesConfig.reverseDay === true ? true : false}
	></div>
	{#if eveningFolder}
		<div
			id="evening-viewer"
			class={viewerReady && !isDay ? 'cloudimage-360 !absolute left-0 top-0 z-[10]' : 'cloudimage-360 invisible'}
			data-folder={eveningFolder}
			data-filename={'{index}.webp'}
			data-amount="24"
			data-keys="false"
			data-drag-speed="400"
			data-spin-reverse={imagesConfig.reverseNight === true ? true : false}
		></div>
	{/if}

	{#if viewerReady && eveningFolder}
		<button
			type="button"
			class="day-night-toggle"
			on:click={toggleDayNight}
			style="position: fixed; top: 3rem; right: 2rem; cursor: pointer; z-index: 1000001; background: white; padding: .4rem; border-radius: 50%;"
		>
			{#if isDay}
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-black"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-black"><path d="M21 12.79A9 9 0 0111.21 3 7 7 0 1012 21a9 9 0 009-8.21z"></path></svg>
			{/if}
		</button>
	{/if}
{/if}

<style>
	.invisible { position: absolute !important; left: -9999px !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important; }
</style>
