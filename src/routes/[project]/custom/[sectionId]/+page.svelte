<script lang="ts">
	import { slide } from 'svelte/transition';
	import { page } from '$app/stores';
	import { dev } from '$app/environment';
	import { projectConfig } from '../../../../stores/ui';
	import SectionFallback from '$lib/components/SectionFallback.svelte';
	import LucideIcon from '$lib/components/LucideIcon.svelte';
	import minimizeBtn from '$lib/images/minimize-icon.svg';
	import maximizeBtn from '$lib/images/maximize-icon.svg';
	import { onMount, onDestroy } from 'svelte';
	import * as Accordion from '$lib/components/ui/accordion';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import Sidebar from './components/Sidebar.svelte';
	import SleekSidePanel from '$lib/components/ui/sleek/SleekSidePanel.svelte';
	import SleekButton from '$lib/components/ui/sleek/SleekButton.svelte';

	$: config = $projectConfig;
	$: sectionId = $page.params.sectionId;

	// Find the matching custom section from config
	$: customSections = $projectConfig?.customSections ?? [];
	$: section = (() => {
		const s = customSections.find((sec) => sec.id === sectionId && sec.enabled !== false);
		if (s) {
			if (Array.isArray(s.catzip)) s.catzip.sort((a, b) => (a.order || 0) - (b.order || 0));
			if (Array.isArray(s.cat24)) s.cat24.sort((a, b) => (a.order || 0) - (b.order || 0));
			if (Array.isArray(s.catstat)) s.catstat.sort((a, b) => (a.order || 0) - (b.order || 0));
			if (Array.isArray(s.categories)) s.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
		}
		return s ?? null;
	})();

	// Images can come from the `images` array or, for single-image sections, a
	// singular `image` field. Entries may be plain URL strings or objects of the
	// shape { title, image }. Normalize everything to { url, title } so either
	// shape renders.
	function normalizeImage(entry) {
		if (typeof entry === 'string') {
			return { url: entry, title: '' };
		}
		if (entry && typeof entry === 'object') {
			return { url: entry.image ?? entry.url ?? '', title: entry.title ?? '' };
		}
		return { url: '', title: '' };
	}
	$: rawImages =
		Array.isArray(section?.images) && section.images.length > 0
			? section.images
			: section?.image
				? [section.image]
				: [];
	$: images = rawImages.map(normalizeImage).filter((img) => img.url);
	// Supported modes: 'single' (one image, no controls), 'pages' (prev/next), 'dropdown' (list)
	$: mode = section?.mode === 'pages' || section?.mode === 'single' ? section.mode : 'dropdown';
	// Image fit: 'cover' fills the whole screen; 'contain' fits inside a box that clears the UI chrome.
	$: rawImageFit = activeItem?.imageFit || section?.imageFit;
	$: imageFit = (typeof rawImageFit === 'string' && rawImageFit.toLowerCase() === 'cover') ? 'cover' : 'contain';

	// Current image index (reset when section changes)
	
	function proxifyUrl(url) {
		if (!url) return url;
		if (dev && url.startsWith('https://assets.vestate.io')) {
			return url.replace('https://assets.vestate.io', '');
		}
		return url;
	}

	let currentIndex = 0;
	let lastSectionId = null;
	$: if (sectionId !== lastSectionId) {
		lastSectionId = sectionId;
		currentIndex = 0;
	}
	// Keep index in range if images list changes
	$: if (currentIndex > images.length - 1) currentIndex = 0;

	$: currentImage = images[currentIndex]?.url ?? '';

	// Derive a readable label: prefer an explicit title, otherwise fall back to
	// the image file name.
	function labelFor(img, index) {
		if (img?.title) return img.title;
		try {
			const file = decodeURIComponent((img?.url ?? '').split('/').pop() ?? '');
			const name = file.replace(/\.[^.]+$/, '').trim();
			if (name) return name;
		} catch (e) {
			// ignore
		}
		return `Page ${index + 1}`;
	}

	function nextPage() {
		if (currentIndex < images.length - 1) currentIndex += 1;
	}
	function prevPage() {
		if (currentIndex > 0) currentIndex -= 1;
	}
	function selectImage(index) {
		currentIndex = index;
	}

	let minimized = false;
	let panelMin = {
		dayNight: true,
		catzip: false,
		cat24: true,
		catstat: true,
		categories: true
	};
	function togglePanel(panel) {
		panelMin[panel] = !panelMin[panel];
	}

	function toggleCustomDayNight() {
		if (!section?.dayNight) return;
		
		const hasDay = Array.isArray(section.dayNight.day) && section.dayNight.day.length > 0;
		const hasEvening = (Array.isArray(section.dayNight.evening) && section.dayNight.evening.length > 0) || (Array.isArray(section.dayNight.night) && section.dayNight.night.length > 0);
		
		if (activeType !== 'dayNight') {
			selectSectionItem('dayNight', null, { timeOfDay: hasDay ? 'day' : 'evening' });
		} else {
			if (timeOfDay === 'day' && hasEvening) {
				selectSectionItem('dayNight', null, { timeOfDay: 'evening' });
			} else if (timeOfDay === 'evening' && hasDay) {
				selectSectionItem('dayNight', null, { timeOfDay: 'day' });
			}
		}
	}
	let activeDropdown = null;
	function toggleDropdown(id) {
		activeDropdown = activeDropdown === id ? null : id;
	}

	// State for dayNightPlus mode
	let activeType = 'default';
	let activeItem = null;
	let selectedImageIndex = 0;
	let timeOfDay = 'day';

	// Panorama state
	let viewer = null;
	let Marzipano = null;
	let allScenes = {};
	let panoScenes = [];
	let currentSceneId = '';
	let pendingSceneId = '';

	function destroyViewer() {
		if (viewer) {
			try {
				viewer.destroy();
			} catch (e) {
				console.error(e);
			}
			viewer = null;
		}
		allScenes = {};
		panoScenes = [];
		currentSceneId = '';
		pendingSceneId = '';
	}

	async function initPanorama(node) {
		if (!activeItem || !activeItem.zipUrl) return;
		destroyViewer();

		if (!Marzipano) {
			const module = await import('marzipano');
			Marzipano = module.default;
		}

		try {
			const dataUrl = proxifyUrl(`${activeItem.zipUrl}/data.json`);
			const tilesFolder = proxifyUrl(`${activeItem.zipUrl}/tiles`);

			const res = await fetch(dataUrl);
			if (!res.ok) throw new Error('Failed to fetch panorama config');
			const appData = await res.json();

			viewer = new Marzipano.Viewer(node, {
				controls: { mouseViewMode: 'drag' }
			});

			const createScene = (sceneData) => {
				const { id, levels, faceSize, initialViewParameters } = sceneData;
				const source = Marzipano.ImageUrlSource.fromString(
					`${tilesFolder}/${id}/{z}/{f}/{y}/{x}.jpg`,
					{
						cubeMapPreviewUrl: `${tilesFolder}/${id}/preview.jpg`
					}
				);
				const geometry = new Marzipano.CubeGeometry(levels);
				const limiter = Marzipano.RectilinearView.limit.traditional(faceSize, (120 * Math.PI) / 180);
				const view = new Marzipano.RectilinearView(initialViewParameters, limiter);
				const scene = viewer.createScene({
					source,
					geometry,
					view,
					pinFirstLevel: true
				});
				allScenes[id] = { scene, view };
			};

			const createLinkHotspot = (scene, hotspot) => {
				const wrapper = document.createElement('div');
				wrapper.classList.add('info-hotspot');

				const imgHotspot = document.createElement('div');
				const targetScene = appData.scenes.find((s) => s.id === hotspot.target);
				const label = hotspot.name || (targetScene ? targetScene.name : hotspot.target) || 'Area Label';

				imgHotspot.innerText = label;
				imgHotspot.classList.add('hotspot');

				wrapper.appendChild(imgHotspot);

				wrapper.addEventListener('click', () => {
					const next = allScenes[hotspot.target];
					if (!next) return;
					next.scene.switchTo();
					currentSceneId = hotspot.target;
				});

				scene.hotspotContainer().createHotspot(wrapper, {
					yaw: hotspot.yaw,
					pitch: hotspot.pitch
				});
			};

			appData.scenes.forEach(createScene);
			appData.scenes.forEach((sceneData) => {
				const current = allScenes[sceneData.id];
				sceneData.linkHotspots?.forEach((hotspot) => {
					createLinkHotspot(current.scene, hotspot);
				});
			});

			const targetSceneId = pendingSceneId && allScenes[pendingSceneId] ? pendingSceneId : appData.scenes[0].id;
			allScenes[targetSceneId].scene.switchTo();
			currentSceneId = targetSceneId;
			panoScenes = appData.scenes;
			pendingSceneId = '';
		} catch (e) {
			console.error('Failed to initialize panorama:', e);
		}
	}

	function panoAction(node, item) {
		initPanorama(node);
		return {
			update(newItem) {
				if (newItem?.id !== item?.id) {
					item = newItem;
					initPanorama(node);
				}
			},
			destroy() {
				destroyViewer();
			}
		};
	}

	function switchToScene(sceneId) {
		if (allScenes[sceneId]) {
			allScenes[sceneId].scene.switchTo();
			currentSceneId = sceneId;
			pendingSceneId = '';
		} else {
			pendingSceneId = sceneId;
		}
	}

	function selectSectionItem(type: string, item: any, options: { timeOfDay?: string } = {}) {
		const previousType = activeType;
		const previousItemId = activeItem?.id;
		
		activeType = type;
		activeItem = item;

		if (type === 'dayNight') {
			timeOfDay = options.timeOfDay || 'day';
			const viewerId = timeOfDay === 'day' ? 'custom-day-viewer' : 'custom-evening-viewer';
			const initialIndex = timeOfDay === 'day' 
				? (section?.dayNight?.initialStartIndexDay || 1) - 1
				: (section?.dayNight?.initialStartIndexNight || 1) - 1;
			switch360Viewer(viewerId, initialIndex);
		} else if (type === 'cat24') {
			const viewerId = `${item.id}-viewer`;
			const initialIndex = (item?.initialViewIndex || 1) - 1;
			switch360Viewer(viewerId, initialIndex);
		} else if (type === 'catstat') {
			selectedImageIndex = 0;
		} else if (type === 'catzip') {
			if (previousType !== 'catzip' || previousItemId !== item?.id) {
				destroyViewer();
			}
		} else if (type === 'categories') {
			if (item?.zipUrl) {
				if (previousType !== 'categories' || previousItemId !== item?.id) {
					destroyViewer();
				}
			} else {
				selectedImageIndex = 0;
			}
		}
	}

	let currentSectionId = '';
	let initialized = false;

	$: if (section && config && sectionId !== currentSectionId) {
		currentSectionId = sectionId;
		initialized = false;
	}

	$: if (section && config && !initialized) {
		if (section.mode === 'dayNightPlus') {
			const hasDay = Array.isArray(section.dayNight?.day) && section.dayNight.day.length > 0;
			const hasEvening = Array.isArray(section.dayNight?.evening) && section.dayNight.evening.length > 0;
			const hasNight = Array.isArray(section.dayNight?.night) && section.dayNight.night.length > 0;

			if (hasDay || hasEvening || hasNight) {
				selectSectionItem('dayNight', null, { timeOfDay: hasDay ? 'day' : (hasEvening ? 'evening' : 'night') });
			} else if (Array.isArray(section.catzip) && section.catzip.length > 0) {
				selectSectionItem('catzip', section.catzip[0]);
				panelMin = { ...panelMin, catzip: false, cat24: true, catstat: true, categories: true };
			} else if (Array.isArray(section.cat24) && section.cat24.length > 0) {
				selectSectionItem('cat24', section.cat24[0]);
				panelMin = { ...panelMin, catzip: true, cat24: false, catstat: true, categories: true };
			} else if (Array.isArray(section.catstat) && section.catstat.length > 0) {
				selectSectionItem('catstat', section.catstat[0]);
				panelMin = { ...panelMin, catzip: true, cat24: true, catstat: false, categories: true };
			} else if (Array.isArray(section.categories) && section.categories.length > 0) {
				selectSectionItem('categories', section.categories[0]);
				panelMin = { ...panelMin, catzip: true, cat24: true, catstat: true, categories: false };
			} else {
				activeType = 'default';
			}
		} else {
			activeType = 'default';
		}
		initialized = true;
	}

	$: currentViewImageUrl = (() => {
		if (activeType === 'catstat') {
			return activeItem?.images?.[selectedImageIndex] ?? '';
		}
		if (activeType === 'categories') {
			if (activeItem?.zipUrl) {
				return '';
			}
			return activeItem?.images?.[selectedImageIndex] ?? activeItem?.image ?? '';
		}
		if (activeType === 'default') {
			return images[currentIndex]?.url ?? '';
		}
		return '';
	})();

	$: currentViewImageAlt = (() => {
		if (activeType === 'catstat') return `${activeItem?.name || 'Static'} - Image ${selectedImageIndex + 1}`;
		if (activeType === 'categories') return `${activeItem?.name || 'Category'}`;
		if (activeType === 'default') return `${section?.name} - ${currentIndex + 1}`;
		return '';
	})();

	// 360 Viewer helper
	function getFolderFromImages(images: string[]) {
		if (!images || images.length === 0) return '';
		const firstImage = images[0];
		const lastSlashIndex = firstImage.lastIndexOf('/');
		return lastSlashIndex !== -1 ? firstImage.substring(0, lastSlashIndex + 1) : '';
	}

	// 360 viewer state
	let viewerReady = false;
	let mounted = false;

	$: placeholderImage = (() => {
		if (activeType === 'dayNight') {
			const imgs = timeOfDay === 'day' ? (section?.dayNight?.day || []) : (section?.dayNight?.evening || section?.dayNight?.night || []);
			const startIndex = timeOfDay === 'day' 
				? (section?.dayNight?.initialStartIndexDay || 1) 
				: (section?.dayNight?.initialStartIndexNight || 1);
			return imgs[startIndex - 1] || imgs[0] || '';
		} else if (activeType === 'cat24') {
			const imgs = activeItem?.images || [];
			const startIndex = activeItem?.initialViewIndex || 1;
			return imgs[startIndex - 1] || imgs[0] || '';
		}
		return '';
	})();

	async function switch360Viewer(viewerId: string, initialIndex: number) {
		await new Promise((resolve) => setTimeout(resolve, 50));
		if (typeof window !== 'undefined' && (window as any).CI360) {
			(window as any).CI360.init();
			let loadedAttempts = 0;
			while (loadedAttempts < 50) {
				const viewers = (window as any).CI360._viewers || [];
				const viewerObj = viewers.find((v: any) => v.id === viewerId);
				if (viewerObj && viewerObj.imagesLoaded) {
					break;
				}
				await new Promise((resolve) => setTimeout(resolve, 100));
				loadedAttempts++;
			}
			if ((window as any).CI360.setActiveIndex) {
				(window as any).CI360.setActiveIndex(viewerId, initialIndex);
			}
		}
	}

	onMount(async () => {
		mounted = true;
		if (section?.mode === 'dayNightPlus') {
			try {
				let attempts = 0;
				while (typeof window !== 'undefined' && !(window as any).CI360 && attempts < 50) {
					await new Promise((resolve) => setTimeout(resolve, 100));
					attempts++;
				}
				if (typeof window !== 'undefined' && (window as any).CI360) {
					(window as any).CI360.init();
					
					// Set initial index for dayNight if active
					await new Promise((resolve) => setTimeout(resolve, 100));
					if (activeType === 'dayNight') {
						const viewerId = timeOfDay === 'day' ? 'custom-day-viewer' : 'custom-evening-viewer';
						const initialIndex = timeOfDay === 'day'
							? (section.dayNight?.initialStartIndexDay || 1) - 1
							: (section.dayNight?.initialStartIndexNight || 1) - 1;
						(window as any).CI360.setActiveIndex(viewerId, initialIndex);
					} else if (activeType === 'cat24' && activeItem) {
						const viewerId = `${activeItem.id}-viewer`;
						const initialIndex = (activeItem?.initialViewIndex || 1) - 1;
						(window as any).CI360.setActiveIndex(viewerId, initialIndex);
					}
					viewerReady = true;
				}
			} catch (e) {
				console.error('Error initializing CI360:', e);
				viewerReady = true;
			}
		}
	});

	// Load BHK Scenes
	let catzipScenesMap = {};
	async function loadAllZipScenes() {
		if (!section) return;
		const zipItems = [];
		if (Array.isArray(section.catzip)) {
			zipItems.push(...section.catzip);
		}
		if (Array.isArray(section.categories)) {
			section.categories.forEach(item => {
				if (item.zipUrl) zipItems.push(item);
			});
		}

		for (const item of zipItems) {
			try {
				const res = await fetch(proxifyUrl(`${item.zipUrl}/data.json`));
				if (res.ok) {
					const data = await res.json();
					catzipScenesMap[item.id] = data.scenes || [];
				}
			} catch (e) {
				console.error(`Failed to load scenes for ${item.name || item.id}:`, e);
			}
		}
		catzipScenesMap = { ...catzipScenesMap };
	}

	$: if (mounted && section && section.mode === 'dayNightPlus') {
		loadAllZipScenes();
	}

	onDestroy(() => {
		destroyViewer();
	});
</script>

{#if !config || Object.keys(config).length === 0 || !section || (section.mode !== 'dayNightPlus' && images.length === 0)}
	<SectionFallback />
{:else}
	<!-- Pages mode: previous / next pagination -->
	{#if section.mode !== 'dayNightPlus' && mode === 'pages' && images.length > 1}
		<div
			class="user-select-none fixed left-0 right-0 top-5 z-[999] mb-2 flex items-center justify-center gap-3"
			style="background: white; width: fit-content; margin: auto; padding: 0.7rem; border-radius: 1rem;"
		>
			<div class="grid w-fit grid-cols-1 gap-2">
				<button on:click={prevPage} class="primary-btn px-3 py-1" disabled={currentIndex === 0}>
					Previous
				</button>
			</div>
			<span class="flex gap-2 text-xl font-bold">
				<span>{currentIndex + 1}</span> /
				<span>{images.length}</span>
			</span>
			<div class="ms-2 grid w-fit grid-cols-1 gap-2">
				<button
					on:click={nextPage}
					class="primary-btn px-4 py-1"
					disabled={currentIndex === images.length - 1}
				>
					Next
				</button>
			</div>
		</div>
	{/if}

	<!-- Loading overlay for CI360 views -->
	{#if section.mode === 'dayNightPlus' && (activeType === 'dayNight' || activeType === 'cat24') && !viewerReady}
		<LoadingOverlay
			isVisible={true}
			variant={placeholderImage ? 'transparent' : 'default'}
		>
			{#if placeholderImage}
				<div class="absolute inset-0 z-[-1]">
					<img src={placeholderImage} alt="Loading..." class="h-full w-full object-cover" fetchpriority="high" decoding="async" />
					<div class="absolute inset-0 bg-black/20"></div>
				</div>
				<div class="flex flex-col items-center">
					<div class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
					<p class="text-sm font-medium uppercase tracking-widest text-white">Initializing 360°</p>
				</div>
			{/if}
		</LoadingOverlay>
	{/if}

	<!-- Main content area -->
	{#if section.mode === 'dayNightPlus' && (activeType === 'dayNight' || activeType === 'cat24')}
		<div class="absolute inset-0 w-full h-full z-[5] pointer-events-auto bg-black">
			<!-- Day 360 Viewer -->
			{#if section.dayNight && Array.isArray(section.dayNight.day) && section.dayNight.day.length > 0}
				{@const dayFolder = getFolderFromImages(section.dayNight.day)}
				<div
					id="custom-day-viewer"
					class={viewerReady && activeType === 'dayNight' && timeOfDay === 'day'
						? 'cloudimage-360 vicinity-360-stage !absolute left-0 top-0 z-[10]'
						: 'cloudimage-360 vicinity-360-stage invisible'}
					data-folder={dayFolder}
					data-filename="{'{'}index{'}'}.webp"
					data-amount="24"
					data-keys="false"
					data-filters="blur:20"
					data-drag-speed="400"
					data-request-responsive-images="true"
					data-info="false"
					data-ratio="1"
				></div>
			{/if}

			<!-- Evening 360 Viewer -->
			{#if section.dayNight && (Array.isArray(section.dayNight.evening) && section.dayNight.evening.length > 0 || Array.isArray(section.dayNight.night) && section.dayNight.night.length > 0)}
				{@const eveningFolder = getFolderFromImages(section.dayNight.evening || section.dayNight.night)}
				<div
					id="custom-evening-viewer"
					class={viewerReady && activeType === 'dayNight' && timeOfDay === 'evening'
						? 'cloudimage-360 vicinity-360-stage !absolute left-0 top-0 z-[10]'
						: 'cloudimage-360 vicinity-360-stage invisible'}
					data-folder={eveningFolder}
					data-filename="{'{'}index{'}'}.webp"
					data-amount="24"
					data-keys="false"
					data-filters="blur:20"
					data-drag-speed="400"
					data-request-responsive-images="true"
					data-info="false"
					data-ratio="1"
				></div>
			{/if}

			<!-- Cat24 360 Viewers -->
			{#if Array.isArray(section.cat24)}
				{#each section.cat24 as item}
					{@const folder = getFolderFromImages(item.images || [])}
					<div
						id="{item.id}-viewer"
						class={viewerReady && activeType === 'cat24' && activeItem?.id === item.id
							? 'cloudimage-360 vicinity-360-stage !absolute left-0 top-0 z-[10]'
							: 'cloudimage-360 vicinity-360-stage invisible'}
						data-folder={folder}
						data-filename="{'{'}index{'}'}.webp"
						data-amount="24"
						data-keys="false"
						data-filters="blur:20"
						data-drag-speed="400"
						data-request-responsive-images="true"
						data-info="false"
						data-ratio="1"
					></div>
				{/each}
			{/if}
		</div>
	{:else if activeType === 'catzip' || (activeType === 'categories' && activeItem?.zipUrl)}
		<div use:panoAction={activeItem} class="absolute inset-0 w-full h-full z-0 bg-black animate-fade-in"></div>
	{:else}
		<div
			class="absolute inset-0 w-full h-full z-0 {imageFit === 'cover' ? 'bg-black' : 'bg-[#000000a6] backdrop-blur-md'}"
		>
			<div class="custom-image-stage {imageFit === 'cover' ? 'is-cover' : 'is-contain'}">
				{#if imageFit === 'contain'}
					<!-- Blurred, filled backdrop of the same image for a smooth letterbox effect -->
					<img class="custom-image-bg" src={currentViewImageUrl} alt="" aria-hidden="true" fetchpriority="high" decoding="async" />
				{/if}
				<img
					class="custom-image"
					style="object-fit: {imageFit};"
					src={currentViewImageUrl}
					alt={currentViewImageAlt}
					fetchpriority="high"
					decoding="async"
				/>
			</div>
		</div>
	{/if}

	<!-- Dropdown mode: selectable list of images -->
	{#if section.mode !== 'dayNightPlus' && mode === 'dropdown'}
		{#if config?.navStyle === 'sidebar'}
			<SleekSidePanel 
				isRightSidebar={true} 
				title={section.name || 'Menu'}
				iconName={section.icon || 'layers'}
				isMinimized={false}
				useLucideIcon={true}
			>
				{#each images as image, i}
					<SleekButton active={currentIndex === i} onClick={() => selectImage(i)}>
						{labelFor(image, i)}
					</SleekButton>
				{/each}
			</SleekSidePanel>
		{:else}
			<div class="left-panel-wrapper !z-[99999999999999]">
				<div class="left-panel p-2">
					<div class="left-panel--header flex justify-between gap-[2rem]">
						<div class="left-title flex items-center font-bold">
							<span class="mr-2 flex items-center">
								<LucideIcon name={section.icon} size={18} color="var(--primary-color)" />
							</span>
							{section.name}
						</div>
						<button
							on:click={() => (minimized = !minimized)}
							class="ghost-btn close-btn !px-0 !py-0"
						>
							{#if !minimized}
								<img src={minimizeBtn} alt="minimize" />
							{:else}
								<img src={maximizeBtn} alt="maximize" />
							{/if}
						</button>
					</div>
					{#if !minimized}
						<div transition:slide={{ duration: 800, axis: 'y' }}>
							<div class="no-hovers pt-3">
								<div class="inner-btn-group">
									{#each images as image, i}
										<button
											on:click={() => selectImage(i)}
											class="inner-modal-btn !w-full {currentIndex === i ? 'active' : ''}"
										>
											{labelFor(image, i)}
										</button>
									{/each}
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{/if}

	<!-- Ensure SleekSidePanel is rendered for 'single' or 'pages' mode to provide global navigation -->
	{#if section.mode !== 'dayNightPlus' && mode !== 'dropdown'}
		{#if config?.navStyle === 'sidebar'}
			<SleekSidePanel 
				isRightSidebar={true} 
				title={section.name || 'Menu'}
				iconName={section.icon || 'layers'}
				isMinimized={false}
				useLucideIcon={true}
			/>
		{/if}
	{/if}

	<!-- DayNightPlus Separate Accordions -->
	{#if section.mode === 'dayNightPlus'}
		<Sidebar {section} {panelMin} {activeType} {activeItem} {currentSceneId} bind:selectedImageIndex {catzipScenesMap} {selectSectionItem} {switchToScene} {togglePanel} isRightSidebar={config?.navStyle === 'sidebar'}>
			<!-- Day & Night Toggle Button -->
			{#if activeType === 'dayNight' && section.dayNight && ((Array.isArray(section.dayNight.day) && section.dayNight.day.length > 0) || (Array.isArray(section.dayNight.evening) && section.dayNight.evening.length > 0) || (Array.isArray(section.dayNight.night) && section.dayNight.night.length > 0))}
				<button
					id="daynighmode"
					type="button"
					class="day-night-toggle"
					on:click={toggleCustomDayNight}
					style="position: fixed; top: 3rem; right: 2rem; cursor: pointer; z-index: 1000001; background: white; padding: .4rem; border-radius: 50%; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"
					aria-label="Toggle day and night mode"
				>
					{#if timeOfDay === 'day' || activeType !== 'dayNight'}
						<!-- Sun icon -->
						<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sun" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
						<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-moon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21 12.79A9 9 0 0111.21 3 7 7 0 1012 21a9 9 0 009-8.21z"></path>
						</svg>
					{/if}
				</button>
			{/if}
		</Sidebar>
	{/if}
{/if}

<style>
	.custom-image-stage {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	/* Blurred, cover-scaled copy of the image that fills the letterbox area. */
	.custom-image-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(28px) brightness(0.55);
		transform: scale(1.15);
		z-index: 0;
		pointer-events: none;
	}

	.custom-image {
		position: relative;
		z-index: 1;
	}

	/* Cover: image fills the entire screen. */
	.custom-image-stage.is-cover .custom-image {
		width: 100%;
		height: 100%;
	}

	/* Contain: image sits inside a box that clears the top chrome (pager / logos)
	   and the bottom navbar, so it never overlaps them. */
	.custom-image-stage.is-contain {
		padding: 5.5rem 1.5rem 7rem;
	}
	.custom-image-stage.is-contain .custom-image {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
	}

	@media (max-width: 768px) {
		.custom-image-stage.is-contain {
			padding: 4.5rem 1rem 6rem;
		}
	}

	:global(.vicinity-360-stage) {
		width: 100% !important;
		height: 100vh !important;
		background: #000 !important;
	}

	.invisible {
		position: absolute !important;
		left: -9999px !important;
		visibility: hidden !important;
		pointer-events: none !important;
		opacity: 0 !important;
	}

	.left-panel-scroll {
		max-height: 60vh;
		overflow-y: auto;
	}
	.sub-panel-scroll {
		max-height: 10rem;
		overflow-y: auto;
	}

	/* Custom scrollbar styling for left panel scroll lists */
	.left-panel-scroll::-webkit-scrollbar,
	.sub-panel-scroll::-webkit-scrollbar {
		width: 4px;
	}
	.left-panel-scroll::-webkit-scrollbar-track,
	.sub-panel-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.left-panel-scroll::-webkit-scrollbar-thumb,
	.sub-panel-scroll::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 99px;
	}
	.left-panel-scroll::-webkit-scrollbar-thumb:hover,
	.sub-panel-scroll::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}
</style>
