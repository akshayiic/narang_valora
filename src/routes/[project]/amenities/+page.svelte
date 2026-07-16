<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { writable, get } from 'svelte/store';
	import { hotspotName, projectConfig } from '../../../stores/ui';
	import * as Accordion from '$lib/components/ui/accordion';
	import { goto } from '$app/navigation';
	import SectionFallback from '$lib/components/SectionFallback.svelte';

	import minimizeBtn from '$lib/images/minimize-icon.svg';
	import maximizeBtn from '$lib/images/maximize-icon.svg';
	import Icon from '$lib/components/Icon.svelte';
	import SleekSidePanel from '$lib/components/ui/sleek/SleekSidePanel.svelte';
	import SleekAccordion from '$lib/components/ui/sleek/SleekAccordion.svelte';
	import SleekButton from '$lib/components/ui/sleek/SleekButton.svelte';

	let viewer;
	let Marzipano;
	let unsubscribeHotSpot;
	let unsubscribeViewChange;
	let mounted = false;

	const isAmenitiesMinimized = writable(false);

	$: config = $projectConfig;
	$: amenitiesConfig = $projectConfig?.amenities?.categories ?? [];
	$: isSectionVisible = config?.sectionVisibility?.amenities;

	// Track the current selected category
	let currentCategory = null;
	let pendingSceneId = null;

	$: dataJson = currentCategory?.zipUrl ? `${currentCategory.zipUrl}/data.json` : null;
	$: tilesFolder = currentCategory?.zipUrl ? `${currentCategory.zipUrl}/tiles` : null;

	let allScenes = {};
	let appData = null;
	let selectedSceneId = writable(null);
	let categoriesWithScenes = writable([]);

	function resetNegativeTranslations(inputString, element) {
		// Regular expression to match translate values
		const translateRegex = /translate[XYZ]?\((-?\d+(\.\d+)?px)\)/g;

		// Replace negative or large translate values
		const transformedString = inputString.replace(translateRegex, (match, value) => {
			const numericValue = parseFloat(value);
			if (numericValue < 0) {
				setTimeout(() => {
					if (match.charAt(9) == 'X') {
						element.classList.add('left-arrow');
					} else {
						element.classList.add('top-arrow');
					}
				}, 200);

				return `translate${match.charAt(9)}(100px)`;
			} else if (match.includes('translateX') && numericValue > window.innerWidth) {
				setTimeout(() => {
					element.classList.add('right-arrow');
				}, 200);

				return `translateX(${window.innerWidth - 250}px)`;
			} else if (match.includes('translateY') && numericValue > window.innerHeight) {
				setTimeout(() => {
					element.classList.add('down-arrow');
				}, 200);

				return `translateY(${window.innerHeight - 200}px)`;
			}
			element.classList.remove('left-arrow');
			element.classList.remove('right-arrow');
			element.classList.remove('down-arrow');
			element.classList.remove('top-arrow');
			return match;
		});

		return transformedString;
	}

	// --------------------------------------------------
	// Destroy viewer safely
	// --------------------------------------------------
	function destroyViewer() {
		if (unsubscribeHotSpot) {
			unsubscribeHotSpot();
			unsubscribeHotSpot = null;
		}
		if (unsubscribeViewChange) {
			unsubscribeViewChange();
			unsubscribeViewChange = null;
		}
		if (viewer) {
			viewer.destroy();
			viewer = null;
		}
		allScenes = {};

		// Clear the pano element to ensure WebGL context is released
		const panoElement = document.getElementById('pano');
		if (panoElement) {
			panoElement.innerHTML = '';
		}
	}

	// --------------------------------------------------
	// Load category data (scenes for accordion)
	// --------------------------------------------------
	async function loadCategoriesData() {
		if (!amenitiesConfig || amenitiesConfig.length === 0) return;

		const categoriesData = await Promise.all(
			amenitiesConfig.map(async (category) => {
				try {
					const dataUrl = `${category.zipUrl}/data.json`;
					const res = await fetch(dataUrl);
					if (!res.ok) return null;
					const data = await res.json();
					return {
						...category,
						scenes: data.scenes || []
					};
				} catch (e) {
					console.error(`Failed to load data for ${category.name}:`, e);
					return null;
				}
			})
		);

		// Filter out failed loads and set the store
		categoriesWithScenes.set(categoriesData.filter((cat) => cat !== null));

		// Auto-select first category if none selected
		if (!currentCategory && categoriesData[0]) {
			currentCategory = categoriesData[0];
		}
	}

	// --------------------------------------------------
	// Initialize Panorama
	// --------------------------------------------------
	async function initPanorama() {
		if (!dataJson || !tilesFolder || !currentCategory) return;

		destroyViewer();

		if (!Marzipano) {
			const module = await import('marzipano');
			Marzipano = module.default;
		}

		const res = await fetch(dataJson);
		appData = await res.json();

		viewer = new Marzipano.Viewer(document.getElementById('pano'), {
			controls: { mouseViewMode: 'drag' }
		});

		// ---------------------------
		// Create Scene
		// ---------------------------
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

		// ---------------------------
		// Create Link Hotspot
		// ---------------------------
		const createLinkHotspot = (scene, hotspot) => {
			const wrapper = document.createElement('div');
			wrapper.classList.add('info-hotspot');

			const imgHotspot = document.createElement('div');
			const targetScene = appData.scenes.find((s) => s.id === hotspot.target);
			
			// Use the raw name from hotspot or target scene to match sidebar exactly
			const label = hotspot.name || (targetScene ? getSceneLabel(targetScene) : hotspot.target) || 'Area Label';
			
			imgHotspot.innerText = label;
			imgHotspot.classList.add('hotspot');

			wrapper.appendChild(imgHotspot);

			wrapper.addEventListener('click', () => {
				const next = allScenes[hotspot.target];
				if (!next) return;

				next.scene.switchTo();
				hotspotName.set(hotspot.target);
			});

			scene.hotspotContainer().createHotspot(wrapper, {
				yaw: hotspot.yaw,
				pitch: hotspot.pitch
			});
		};

		// 1️⃣ Create scenes
		appData.scenes.forEach(createScene);

		// 2️⃣ Create hotspots
		appData.scenes.forEach((sceneData) => {
			const current = allScenes[sceneData.id];
			sceneData.linkHotspots?.forEach((hotspot) => {
				createLinkHotspot(current.scene, hotspot);
			});
		});

		// 3️⃣ Start first scene
		let targetSceneId = (pendingSceneId && allScenes[pendingSceneId]) ? pendingSceneId : appData.scenes[0].id;
		
		allScenes[targetSceneId].scene.switchTo();
		hotspotName.set(targetSceneId);
		selectedSceneId.set(targetSceneId);
		pendingSceneId = null;

		// 4️⃣ Subscribe external scene changes
		unsubscribeHotSpot = hotspotName.subscribe((changed) => {
			if (!allScenes[changed]) return;

			allScenes[changed].scene.switchTo();

			console.log('current hotspot looker', changed);

			// Get current scene view
			const currentScene = allScenes[changed];

			// Update hotspot positions when view changes (during drag)
			if (unsubscribeViewChange) {
				unsubscribeViewChange();
			}

			unsubscribeViewChange = currentScene.view.addEventListener('change', function () {
				document.querySelectorAll('.info-hotspot').forEach((e) => {
					const hotspotElement = e.querySelector('.hotspot');
					if (hotspotElement) {
						const hotspotWrapper = e as HTMLElement;
						hotspotWrapper.style.transform = resetNegativeTranslations(
							hotspotWrapper.style.transform,
							hotspotElement
						);
					}
				});
			});
		});
	}

	onMount(() => {
		if (isSectionVisible) {
			mounted = true;
			loadCategoriesData();
		}

		// Click listener for coordinate logging
		const panoElement = document.getElementById('pano');
		if (panoElement) {
			panoElement.addEventListener('click', (e) => {
				if (!viewer) return;
				const scene = viewer.scene();
				if (!scene) return;
				const view = scene.view();

				// Get coordinates relative to the pano container
				const rect = panoElement.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				// Convert screen coordinates to panorama yaw/pitch
				const coords = view.screenToCoordinates({ x, y });
				console.log('Clicked Coordinates (Yaw, Pitch):', coords.yaw, coords.pitch);
			});
		}

		return () => destroyViewer();
	});

	// Reload categories data when config changes
	$: if (mounted && amenitiesConfig.length > 0) {
		loadCategoriesData();
	}

	// Track last initialized category to prevent duplicate initializations
	let lastInitializedCategoryId = null;

	// Reinitialize when category changes
	$: if (mounted && currentCategory && currentCategory.id !== lastInitializedCategoryId) {
		lastInitializedCategoryId = currentCategory.id;
		initPanorama();
	}

	// Switch to specific scene
	function switchToScene(sceneId) {
		if (!allScenes[sceneId]) return;
		allScenes[sceneId].scene.switchTo();
		hotspotName.set(sceneId);
		selectedSceneId.set(sceneId);
	}

	// Switch category and load its panorama
	function switchCategory(category, sceneId = null) {
		if (currentCategory?.id === category.id) {
			if (sceneId) switchToScene(sceneId);
			return;
		}
		currentCategory = category;
		pendingSceneId = sceneId;
	}

	// Helper to format scene name
	function getSceneLabel(scene) {
		return scene.name || scene.id || 'Unnamed Scene';
	}

	// Helper to capitalize text (first letter uppercase, rest lowercase)
	function capitalizeText(text) {
		if (!text || typeof text !== 'string') return text;
		// Remove numeric prefix like "1-", "2-", etc.
		let cleanedText = text.replace(/^\d+-/, '');
		// Replace hyphens and underscores with spaces
		cleanedText = cleanedText.replace(/[_-]/g, ' ');
		// Capitalize first letter of each word
		return cleanedText
			.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

{#if !config || Object.keys(config).length === 0 || !isSectionVisible}
	<SectionFallback />
{:else}
	<SleekSidePanel 
		isRightSidebar={config?.navStyle === 'sidebar'} 
		title={$projectConfig?.sectionAliases?.amenities?.trim() || 'Amenities'}
		iconName="amenities"
		isMinimized={$isAmenitiesMinimized}
		toggleMinimize={() => $isAmenitiesMinimized = !$isAmenitiesMinimized}
	>
		<!-- SLEEK SIDEBAR CONTENT -->
		{#if $categoriesWithScenes && $categoriesWithScenes.length > 0}
			{#each $categoriesWithScenes as category, index}
				<SleekAccordion title={category.name || 'Unnamed Category'} isOpen={index === 0}>
					{#if category.scenes && category.scenes.length > 0}
						{#each category.scenes as scene}
							<SleekButton 
								active={$hotspotName == scene.id}
								onClick={() => switchCategory(category, scene.id)}
							>
								{getSceneLabel(scene)}
							</SleekButton>
						{/each}
					{:else}
						<p class="p-2 text-sm text-white/50">No scenes available</p>
					{/if}
				</SleekAccordion>
			{/each}
		{:else}
			<p class="p-2 text-sm text-white/50">Loading categories...</p>
		{/if}

		<!-- THEME FALLBACK CONTENT -->
		<svelte:fragment slot="fallback">
			<div class="left-panel p-2">
				<div class="left-panel--header flex justify-between gap-[5rem]">
					<div class="left-title flex items-center font-bold">
						<Icon name="amenities" size={25} class="mr-2" />
						{$projectConfig?.sectionAliases?.amenities?.trim() || 'Amenities'}
					</div>
					<button
						on:click={() => {
							$isAmenitiesMinimized = !$isAmenitiesMinimized;
						}}
						class="ghost-btn close-btn border border-transparent !px-0 !py-0"
						id="minimize-toggle-amenities"
					>
						{#if !$isAmenitiesMinimized}
							<img id="ams-mm" src={minimizeBtn} alt="minimize" />
						{/if}
						{#if $isAmenitiesMinimized}
							<img id="ams-mx" src={maximizeBtn} alt="maximize" />
						{/if}
					</button>
				</div>

				<div class={!$isAmenitiesMinimized ? 'block' : 'hidden'}>
					<div class="pt-3">
						<div class="inner-btn-group">
							{#if $categoriesWithScenes && $categoriesWithScenes.length > 0}
								<Accordion.Root class="w-full sm:max-w-full">
									{#each $categoriesWithScenes as category, index}
										<Accordion.Item value={category.id || `category-${index}`}>
											<Accordion.Trigger id="grolevel">
												{category.name || 'Unnamed Category'}
											</Accordion.Trigger>
											<Accordion.Content>
												{#if category.scenes && category.scenes.length > 0}
													{#each category.scenes as scene}
														<button
															class={$hotspotName == scene.id
																? 'active inner-modal-btn'
																: 'inner-modal-btn'}
															id={scene.id + '-am'}
															on:click={() => switchCategory(category, scene.id)}
														>
															{getSceneLabel(scene)}
														</button>
													{/each}
												{:else}
													<p class="p-2 text-sm text-gray-500">No scenes available</p>
												{/if}
											</Accordion.Content>
										</Accordion.Item>
									{/each}
								</Accordion.Root>
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

<div id="pano"></div>

<style>
	#pano {
		width: 100%;
		height: 100vh;
		background: black;
	}
</style>
