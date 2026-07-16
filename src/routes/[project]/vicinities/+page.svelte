<script lang="js">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { projectConfig } from '../../../stores/ui';
	import { fade } from 'svelte/transition';
	import SleekSidePanel from '$lib/components/ui/sleek/SleekSidePanel.svelte';
	import SleekAccordion from '$lib/components/ui/sleek/SleekAccordion.svelte';
	import SleekButton from '$lib/components/ui/sleek/SleekButton.svelte';
	import SectionFallback from '$lib/components/SectionFallback.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';

	let mounted = false;
	let modeInitialized = false;
	const isVicinitiesMinimized = writable(false);
	const isDay = writable(true);
	const selectedImage = writable(null);

	$: config = $projectConfig;
	$: vicinitiesConfig = config?.vicinities ?? {};
	$: categories = vicinitiesConfig?.categories ?? [];

	// Extract folder path from image array
	function getFolderFromImages(images) {
		if (!images || images.length === 0) return '';
		const firstImage = images[0];
		// Remove the filename (e.g., "1.webp") and return the folder path
		const lastSlashIndex = firstImage.lastIndexOf('/');
		return lastSlashIndex !== -1 ? firstImage.substring(0, lastSlashIndex + 1) : '';
	}

	$: dayFolder = vicinitiesConfig ? getFolderFromImages(vicinitiesConfig.day || []) : '';
	$: eveningFolder = vicinitiesConfig ? getFolderFromImages(vicinitiesConfig.evening || []) : '';
	$: isSectionVisible = config?.sectionVisibility?.vicinities;

	let placeholderImage = '';
	$: if (vicinitiesConfig) {
		if (!modeInitialized && vicinitiesConfig.defaultMode) {
			isDay.set(vicinitiesConfig.defaultMode === 'day');
			modeInitialized = true;
		}

		const currentModeImages = $isDay ? vicinitiesConfig.day || [] : vicinitiesConfig.evening || [];
		const startIndex = $isDay
			? vicinitiesConfig.initialStartIndexDay || 1
			: vicinitiesConfig.initialStartIndexNight || 1;
		placeholderImage = currentModeImages[startIndex - 1] || currentModeImages[0] || '';
	}

	// Show static image when one is selected, otherwise show 360 viewer
	$: showStaticImage = $selectedImage !== null;

	// Track if viewer is ready to show
	let viewerReady = false;

	onMount(async () => {
		if (isSectionVisible && config) {
			mounted = true;

			// Preload placeholder image
			if (placeholderImage) {
				const img = new Image();
				img.src = placeholderImage;
				await new Promise((resolve) => {
					img.onload = resolve;
					img.onerror = resolve;
				});
				console.log('[Vicinities] Placeholder image preloaded');
			}

			try {
				console.log('[Vicinity 360 Viewer] Initializing with config', vicinitiesConfig);

				// Wait for CI360 script to be available
				let attempts = 0;
				while (!window.CI360 && attempts < 50) {
					await new Promise((resolve) => setTimeout(resolve, 100));
					attempts++;
				}

				if (!window.CI360) {
					console.error('[Vicinity 360 Viewer] CI360 script not loaded');
					return;
				}

				// Hide viewer initially to prevent glitch
				viewerReady = false;

				// Initialize the viewer
				window.CI360.init();

				// Wait for both potential viewers to load
				const viewerIds = ['vicinity-day-viewer', 'vicinity-evening-viewer'];
				for (const vid of viewerIds) {
					if (vid === 'vicinity-evening-viewer' && !eveningFolder) continue;

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
						vid === 'vicinity-day-viewer'
							? (vicinitiesConfig.initialStartIndexDay || 1) - 1
							: (vicinitiesConfig.initialStartIndexNight || 1) - 1;

					if (window.CI360 && window.CI360.setActiveIndex) {
						window.CI360.setActiveIndex(vid, initialIndex);
						console.log(`[Vicinity 360 Viewer] ${vid} position set to ${initialIndex}`);
					}
				}

				// Show viewer after positions are set
				await new Promise((resolve) => setTimeout(resolve, 100));
				viewerReady = true;
				console.log('[Vicinity 360 Viewer] Ready to display');
			} catch (error) {
				console.error('Error initializing vicinity cloud:', error);
				viewerReady = true; // Show viewer even if there's an error
			}
		}
	});

	async function toggleDayNight() {
		isDay.update((value) => !value);
		const newIsDay = !$isDay;

		// Wait for DOM to update, then ensure the newly visible viewer is correctly positioned
		await new Promise((resolve) => setTimeout(resolve, 100));

		try {
			const viewerId = newIsDay ? 'vicinity-day-viewer' : 'vicinity-evening-viewer';
			const initialIndex = newIsDay
				? (vicinitiesConfig.initialStartIndexDay || 1) - 1
				: (vicinitiesConfig.initialStartIndexNight || 1) - 1;

			console.log(
				`[Vicinity 360 Viewer] Toggling to ${newIsDay ? 'day' : 'evening'}, index: ${initialIndex}`
			);

			if (window.CI360) {
				// Re-init just in case
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
					// Small extra delay to ensure the library is ready to receive commands
					await new Promise((resolve) => setTimeout(resolve, 50));
					window.CI360.setActiveIndex(viewerId, initialIndex);
					console.log(`[Vicinity 360 Viewer] Position set to ${initialIndex}`);
				}
			}
		} catch (error) {
			console.error('Error reinitializing vicinity cloud:', error);
		}
	}

	function selectImage(imageUrl) {
		selectedImage.set(imageUrl);
	}

	function getImageLabel(imageUrl) {
		if (!imageUrl) return 'Unnamed Location';
		// Extract filename from URL
		const parts = imageUrl.split('/');
		const filename = parts[parts.length - 1];
		// Remove file extension
		return filename.replace('.webp', '').replace(/-/g, ' ');
	}

	// Helper to capitalize text
	function capitalizeText(text) {
		if (!text) return text;
		return text
			.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

<LoadingOverlay
	isVisible={!config || !viewerReady}
	variant={config && placeholderImage ? 'transparent' : 'default'}
>
	{#if config && placeholderImage && !viewerReady}
		<div class="absolute inset-0 z-[-1]">
			<img src={placeholderImage} alt="Loading..." class="h-full w-full object-cover" fetchpriority="high" decoding="async" />
			<div class="absolute inset-0 bg-black/20"></div>
		</div>
		<div class="flex flex-col items-center">
			<div
				class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white"
			></div>
			<p class="text-sm font-medium uppercase tracking-widest text-white">Initializing 360°</p>
		</div>
	{/if}
</LoadingOverlay>

{#if !config || (config && Object.keys(config).length === 0) || !isSectionVisible}
	<SectionFallback />
{:else}
	<!-- UI elements only show when viewer is ready -->
	{#if viewerReady}
		<!-- Day/Night Toggle Button -->
		{#if eveningFolder}
			<button
				id="daynighmodevic"
				type="button"
				class="day-night-toggle"
				on:click={toggleDayNight}
				style="position: fixed; top: 2rem; right: 2rem; cursor: pointer; z-index: 1000001; background: white; padding: .4rem; border-radius: 50%; border: none;"
				aria-label="Toggle day and night mode"
			>
				{#if $isDay}
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

		<SleekSidePanel 
			isRightSidebar={config?.navStyle === 'sidebar'} 
			title={$projectConfig?.sectionAliases?.vicinities?.trim() || 'Vicinities'}
			iconName="vicinities"
			isMinimized={$isVicinitiesMinimized}
			toggleMinimize={() => $isVicinitiesMinimized = !$isVicinitiesMinimized}
		>
			<!-- SLEEK SIDEBAR CONTENT -->
			{#if categories && categories.length > 0}
				{#each categories as category, index}
					<SleekAccordion title={category.name || 'Unnamed Category'} isOpen={index === 0}>
						{#if category.images && category.images.length > 0}
							{#each category.images as image}
								<SleekButton
									active={$selectedImage === image.image}
									onClick={() => selectImage(image.image)}
								>
									{image.title ? image?.title : capitalizeText(getImageLabel(image.image))}
								</SleekButton>
							{/each}
						{:else}
							<p class="p-2 text-sm text-white/50">No images available</p>
						{/if}
					</SleekAccordion>
				{/each}
			{:else}
				<p class="p-2 text-sm text-white/50">Loading vicinities...</p>
			{/if}

			<!-- THEME FALLBACK CONTENT -->
			<svelte:fragment slot="fallback">
				<div class="left-panel p-2">
					<div class="left-panel--header flex justify-between gap-[5rem]">
						<div class="left-title flex items-center font-bold">
							<Icon name="vicinities" size={25} class="mr-2" />
							{$projectConfig?.sectionAliases?.vicinities?.trim() || 'Vicinities'}
						</div>
						<button
							on:click={() => {
								$isVicinitiesMinimized = !$isVicinitiesMinimized;
							}}
							class="ghost-btn close-btn !px-0 !py-0"
							id="minimize-toggle-vicinity"
						>
							{#if !$isVicinitiesMinimized}
								<img src={minimizeBtn} alt="minimize" />
							{/if}
							{#if $isVicinitiesMinimized}
								<img src={maximizeBtn} alt="maximize" />
							{/if}
						</button>
					</div>

					<div class={!$isVicinitiesMinimized ? 'block' : 'hidden'}>
						<div class="pt-3">
							<div class="inner-btn-group">
								{#if categories && categories.length > 0}
									<Accordion.Root class="w-full sm:max-w-full" multiple={true}>
										{#each categories as category, index}
											<Accordion.Item value={category.id || `category-${index}`}>
												<Accordion.Trigger id="vicinity-{category.id}">
													{category.name || 'Unnamed Category'}
												</Accordion.Trigger>
												<Accordion.Content>
													{#if category.images && category.images.length > 0}
														{#each category.images as image}
															<button
																class={$selectedImage === image.image
																	? 'active inner-modal-btn'
																	: 'inner-modal-btn'}
																id="vicinity-{category.id}-{index}"
																on:click={() => selectImage(image.image)}
															>
																{image.title
																	? image?.title
																	: capitalizeText(getImageLabel(image.image))}
															</button>
														{/each}
													{:else}
														<p class="p-2 text-sm text-gray-500">No images available</p>
													{/if}
												</Accordion.Content>
											</Accordion.Item>
										{/each}
									</Accordion.Root>
								{:else}
									<p class="p-2 text-sm text-gray-500">Loading vicinities...</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</svelte:fragment>
		</SleekSidePanel>
	{/if}

	<!-- View Container - Must be in DOM for initialization -->
	<div class="d-block visible absolute bottom-0 left-0 right-0 top-0">
		<!-- Day 360 Viewer -->
		{#if dayFolder}
			<div
				id="vicinity-day-viewer"
				class={viewerReady && $isDay && !showStaticImage
					? 'cloudimage-360 !absolute left-0 top-0 z-[10]'
					: 'cloudimage-360 invisible'}
				data-folder={dayFolder}
				data-filename="{'{'}index{'}'}.webp"
				data-amount="24"
				data-keys="false"
				data-filters="blur:20"
				data-drag-speed="400"
				data-spin-reverse={vicinitiesConfig?.reverseDay === true ? true : false}
				data-request-responsive-images="true"
				data-info="false"
				data-ratio="1"
			></div>
		{/if}

		<!-- Evening 360 Viewer -->
		{#if eveningFolder}
			<div
				id="vicinity-evening-viewer"
				class={viewerReady && !$isDay && !showStaticImage
					? 'cloudimage-360 !absolute left-0 top-0 z-[10]'
					: 'cloudimage-360 invisible'}
				data-folder={eveningFolder}
				data-filename={'{index}.webp'}
				data-amount="24"
				data-keys="false"
				data-filters="blur:20"
				data-drag-speed="400"
				data-spin-reverse={vicinitiesConfig?.reverseNight === true ? true : false}
				data-request-responsive-images="true"
				data-info="false"
				data-ratio="1"
			></div>
		{/if}

		<!-- Static Image Display -->
		{#if showStaticImage && $selectedImage && viewerReady}
			<img
				src={$selectedImage}
				alt="Selected Vicinity"
				class="absolute top-0 h-full w-full object-cover"
			/>
		{/if}
	</div>
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
</style>
