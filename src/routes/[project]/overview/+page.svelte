<script lang="js">
	import { onMount } from 'svelte';
	import 'lazysizes';
	import { projectConfig } from '../../../stores/ui';
	import { goto } from '$app/navigation';
	import SectionFallback from '$lib/components/SectionFallback.svelte';
	import SleekSidePanel from '$lib/components/ui/sleek/SleekSidePanel.svelte';
import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';

	let modeInitialized = false;

	$: config = $projectConfig;
	$: isSectionVisible = config?.sectionVisibility?.overview;

	$: if (config) {
		console.log('[Overview] Config updated:', { config: !!config, isSectionVisible });
	}

	// Extract folder path from image array
	function getFolderFromImages(images) {
		if (!images || images.length === 0) return '';
		const firstImage = images[0];
		// Remove the filename (e.g., "1.webp") and return the folder path
		const lastSlashIndex = firstImage.lastIndexOf('/');
		return lastSlashIndex !== -1 ? firstImage.substring(0, lastSlashIndex + 1) : '';
	}

	let dayFolder = '';
	let eveningFolder = '';
	let placeholderImage = '';
	let isDay = true;

	// Update folders when config changes
	$: if (config) {
		if (!modeInitialized && config.overviewImages?.defaultMode) {
			isDay = config.overviewImages.defaultMode === 'day';
			modeInitialized = true;
		}

		dayFolder = getFolderFromImages(config.overviewImages?.day || []);
		eveningFolder = getFolderFromImages(config.overviewImages?.evening || []);

		// Set initial placeholder image
		const currentModeImages = isDay
			? config.overviewImages?.day || []
			: config.overviewImages?.evening || [];
		const startIndex = isDay
			? config.overviewImages?.initialStartIndexDay || 1
			: config.overviewImages?.initialStartIndexNight || 1;
		placeholderImage = currentModeImages[startIndex - 1] || currentModeImages[0] || '';
	}

	// Track if viewer is ready to show
	let viewerReady = false;

	// Check if section is visible and redirect if not
	onMount(async () => {
		console.log('[Overview] onMount called', { isSectionVisible, config: !!config });

		if (!config) {
			console.error('[Overview] Config not available after waiting');
			return;
		}

		// Update folders now that config is available
		dayFolder = getFolderFromImages(config.overviewImages?.day || []);
		eveningFolder = getFolderFromImages(config.overviewImages?.evening || []);

		// Preload placeholder image
		if (placeholderImage) {
			const img = new Image();
			img.src = placeholderImage;
			await new Promise((resolve) => {
				img.onload = resolve;
				img.onerror = resolve;
			});
			console.log('[Overview] Placeholder image preloaded');
		}

		if (isSectionVisible && config) {
			try {
				console.log('[360 Viewer] Initializing with config', config);

				if (!window.CI360) {
					console.error('[360 Viewer] CI360 script not loaded');
					return;
				}

				// Hide viewer initially to prevent glitch
				viewerReady = false;

				// Initialize the viewers
				window.CI360.init();

				// Wait for both potential viewers to load
				const viewerIds = ['day-viewer', 'evening-viewer'];
				for (const vid of viewerIds) {
					if (vid === 'evening-viewer' && !eveningFolder) continue;

					let loadedAttempts = 0;
					while (loadedAttempts < 100) {
						const viewers = window.CI360._viewers || [];
						const viewer = viewers.find((v) => v.id === vid);
						if (viewer && viewer.imagesLoaded) {
							break;
						}
						await new Promise((resolve) => setTimeout(resolve, 100));
						loadedAttempts++;
					}

					const initialIndex =
						vid === 'day-viewer'
							? (config.overviewImages?.initialStartIndexDay || 1) - 1
							: (config.overviewImages?.initialStartIndexNight || 1) - 1;

					if (window.CI360 && window.CI360.setActiveIndex) {
						window.CI360.setActiveIndex(vid, initialIndex);
						console.log(`[360 Viewer] ${vid} position set to ${initialIndex}`);
					}
				}

				viewerReady = true;
				console.log('[360 Viewer] Ready to display');
			} catch (error) {
				console.error('Error initializing cloud:', error);
				viewerReady = true; // Show viewer even if there's an error
			}
		}
	});

	let dayViewer;
	let eveningViewer;

	async function toggleDayNight() {
		isDay = !isDay;

		// Wait for DOM to update, then ensure the newly visible viewer is correctly positioned
		await new Promise((resolve) => setTimeout(resolve, 100));

		try {
			const viewerId = isDay ? 'day-viewer' : 'evening-viewer';
			const initialIndex = isDay
				? (config.overviewImages?.initialStartIndexDay || 1) - 1
				: (config.overviewImages?.initialStartIndexNight || 1) - 1;

			console.log(`[360 Viewer] Toggling to ${isDay ? 'day' : 'evening'}, index: ${initialIndex}`);

			if (window.CI360) {
				// Re-init just in case, though they should be initialized from onMount
				window.CI360.init();

				// Wait for initialization and images to load
				let loadedAttempts = 0;
				while (loadedAttempts < 100) {
					const viewers = window.CI360._viewers || [];
					const viewer = viewers.find((v) => v.id === viewerId);
					if (viewer && viewer.imagesLoaded) {
						break;
					}
					await new Promise((resolve) => setTimeout(resolve, 100));
					loadedAttempts++;
				}

				// Set position
				if (window.CI360.setActiveIndex) {
					// Small extra delay to ensure the library is ready to receive commands
					await new Promise((resolve) => setTimeout(resolve, 50));
					window.CI360.setActiveIndex(viewerId, initialIndex);
					console.log(`[360 Viewer] Position set to ${initialIndex}`);
				}
			}
		} catch (error) {
			console.error('Error reinitializing cloud:', error);
		}
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


<SleekSidePanel isRightSidebar={config?.navStyle === 'sidebar'} />
{#if config && isSectionVisible}
	<!-- Day 360 Viewer - Must be in DOM for initialization -->
	<div
		id="day-viewer"
		class={viewerReady && isDay
			? 'cloudimage-360 !absolute left-0 top-0 z-[10]'
			: 'cloudimage-360 invisible'}
		data-folder={dayFolder}
		data-filename={'{index}.webp'}
		data-amount="24"
		data-keys="false"
		data-filters="blur:20"
		data-drag-speed="400"
		data-spin-reverse={config.overviewImages?.reverseDay === true ? true : false}
		data-request-responsive-images="true"
		data-info="false"
		data-ratio="1"
	></div>

	<!-- Evening 360 Viewer -->
	{#if eveningFolder}
		<div
			id="evening-viewer"
			class={viewerReady && !isDay
				? 'cloudimage-360 !absolute left-0 top-0 z-[10]'
				: 'cloudimage-360 invisible'}
			data-folder={eveningFolder}
			data-filename={'{index}.webp'}
			data-amount="24"
			data-keys="false"
			data-filters="blur:20"
			data-drag-speed="400"
			data-spin-reverse={config.overviewImages?.reverseNight === true ? true : false}
			data-request-responsive-images="true"
			data-info="false"
			data-ratio="1"
		></div>
	{/if}

	<!-- UI elements only show when viewer is ready -->
	{#if viewerReady}
		<!-- Day/Night Toggle Button -->
		{#if eveningFolder}
			<button
				id="daynighmode"
				type="button"
				class="day-night-toggle"
				on:click={toggleDayNight}
				style="position: fixed; top: 3rem; right: 2rem; cursor: pointer; z-index: 1000001; background: white; padding: .4rem; border-radius: 50%;"
				aria-label="Toggle day and night mode"
			>
				{#if isDay}
					<!-- Sun icon -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="icon icon-sun"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="5"></circle>
						<line x1="12" y1="1" x2="12" y2="3"></line>
						<line x1="12" y1="21" x2="12" y2="23"></line>
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
						<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
						<line x1="1" y1="12" x2="3" y2="12"></line>
						<line x1="21" y1="12" x2="23" y2="12"></line>
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
						<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
					</svg>
				{:else}
					<!-- Moon icon -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="icon icon-moon"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 12.79A9 9 0 0111.21 3 7 7 0 1012 21a9 9 0 009-8.21z"></path>
					</svg>
				{/if}
			</button>
		{/if}
	{/if}
{:else if config && !isSectionVisible}
	<SectionFallback />
{/if}

<style>
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
	.touch-point-content {
		transition: all 1s ease-in-out;
		animation: fadeOut 0.7s forwards;
		visibility: hidden;
	}
	.touch-point-wrapper {
		position: absolute;
		top: 65%;
		z-index: 99999;
		right: 51%;
		cursor: pointer;
		display: flex;
		align-items: center;
	}

	.touch-point-wrapper-3 {
		position: absolute;
		bottom: 18%;
		right: 56.3%;
		display: flex;
		cursor: pointer;
		align-content: center;
		align-items: center;
		gap: 0.6rem;
	}
</style>
