<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { writable, get } from 'svelte/store';
	import { hotspotName, projectConfig } from '../../../stores/ui';
	import * as Accordion from '$lib/components/ui/accordion';
	import SectionFallback from '$lib/components/SectionFallback.svelte';
	import minimizeBtn from '$lib/images/minimize-icon.svg';
	import maximizeBtn from '$lib/images/maximize-icon.svg';
	import Icon from '$lib/components/Icon.svelte';
	import SleekSidePanel from '$lib/components/ui/sleek/SleekSidePanel.svelte';
	import SleekAccordion from '$lib/components/ui/sleek/SleekAccordion.svelte';
	import SleekButton from '$lib/components/ui/sleek/SleekButton.svelte';

	export let config;
	export let sectionId;

	let viewer;
	let Marzipano;
	let unsubscribeHotSpot;
	let unsubscribeViewChange;
	let mounted = false;

	const isMinimized = writable(false);

	$: sectionConfig = config?.[sectionId]?.categories ?? [];
	$: isSectionVisible = config?.sectionVisibility?.[sectionId];

	let currentCategory = null;
	let pendingSceneId = null;

	$: dataJson = currentCategory?.zipUrl ? `${currentCategory.zipUrl}/data.json` : null;
	$: tilesFolder = currentCategory?.zipUrl ? `${currentCategory.zipUrl}/tiles` : null;

	let allScenes = {};
	let appData = null;
	let selectedSceneId = writable(null);
	let categoriesWithScenes = writable([]);

	function resetNegativeTranslations(inputString, element) {
		const translateRegex = /translate[XYZ]?\((-?\d+(\.\d+)?px)\)/g;
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
				setTimeout(() => element.classList.add('right-arrow'), 200);
				return `translateX(${window.innerWidth - 250}px)`;
			} else if (match.includes('translateY') && numericValue > window.innerHeight) {
				setTimeout(() => element.classList.add('down-arrow'), 200);
				return `translateY(${window.innerHeight - 200}px)`;
			}
			element.classList.remove('left-arrow', 'right-arrow', 'down-arrow', 'top-arrow');
			return match;
		});
		return transformedString;
	}

	function destroyViewer() {
		if (unsubscribeHotSpot) { unsubscribeHotSpot(); unsubscribeHotSpot = null; }
		if (unsubscribeViewChange) { unsubscribeViewChange(); unsubscribeViewChange = null; }
		if (viewer) { viewer.destroy(); viewer = null; }
		allScenes = {};
		const panoElement = document.getElementById('pano');
		if (panoElement) panoElement.innerHTML = '';
	}

	async function loadCategoriesData() {
		if (!sectionConfig || sectionConfig.length === 0) return;
		const categoriesData = await Promise.all(
			sectionConfig.map(async (category) => {
				try {
					const dataUrl = `${category.zipUrl}/data.json`;
					const res = await fetch(dataUrl);
					if (!res.ok) return null;
					const data = await res.json();
					return { ...category, scenes: data.scenes || [] };
				} catch (e) {
					console.error(`Failed to load data for ${category.name}:`, e);
					return null;
				}
			})
		);
		categoriesWithScenes.set(categoriesData.filter((cat) => cat !== null));
		if (!currentCategory && categoriesData[0]) {
			currentCategory = categoriesData[0];
		}
	}

	async function initPanorama() {
		if (!dataJson || !tilesFolder || !currentCategory) return;
		destroyViewer();

		if (!Marzipano) {
			const module = await import('marzipano');
			Marzipano = module.default;
		}

		const res = await fetch(dataJson);
		appData = await res.json();

		viewer = new Marzipano.Viewer(document.getElementById('pano'), { controls: { mouseViewMode: 'drag' } });

		const createScene = (sceneData) => {
			const { id, levels, faceSize, initialViewParameters } = sceneData;
			const source = Marzipano.ImageUrlSource.fromString(`${tilesFolder}/${id}/{z}/{f}/{y}/{x}.jpg`, { cubeMapPreviewUrl: `${tilesFolder}/${id}/preview.jpg` });
			const geometry = new Marzipano.CubeGeometry(levels);
			const limiter = Marzipano.RectilinearView.limit.traditional(faceSize, (120 * Math.PI) / 180);
			const view = new Marzipano.RectilinearView(initialViewParameters, limiter);
			const scene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });
			allScenes[id] = { scene, view };
		};

		const createLinkHotspot = (scene, hotspot) => {
			const wrapper = document.createElement('div');
			wrapper.classList.add('info-hotspot');
			const imgHotspot = document.createElement('div');
			const targetScene = appData.scenes.find((s) => s.id === hotspot.target);
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
			scene.hotspotContainer().createHotspot(wrapper, { yaw: hotspot.yaw, pitch: hotspot.pitch });
		};

		appData.scenes.forEach(createScene);
		appData.scenes.forEach((sceneData) => {
			const current = allScenes[sceneData.id];
			sceneData.linkHotspots?.forEach((hotspot) => createLinkHotspot(current.scene, hotspot));
		});

		let targetSceneId = (pendingSceneId && allScenes[pendingSceneId]) ? pendingSceneId : appData.scenes[0].id;
		allScenes[targetSceneId].scene.switchTo();
		hotspotName.set(targetSceneId);
		selectedSceneId.set(targetSceneId);
		pendingSceneId = null;

		unsubscribeHotSpot = hotspotName.subscribe((changed) => {
			if (!allScenes[changed]) return;
			allScenes[changed].scene.switchTo();
			const currentScene = allScenes[changed];
			if (unsubscribeViewChange) unsubscribeViewChange();
			unsubscribeViewChange = currentScene.view.addEventListener('change', function () {
				document.querySelectorAll('.info-hotspot').forEach((e) => {
					const hotspotElement = e.querySelector('.hotspot');
					if (hotspotElement) {
						const hotspotWrapper = e as HTMLElement;
						hotspotWrapper.style.transform = resetNegativeTranslations(hotspotWrapper.style.transform, hotspotElement);
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
		return () => destroyViewer();
	});

	$: if (mounted && sectionConfig.length > 0) loadCategoriesData();

	let lastInitializedCategoryId = null;
	$: if (mounted && currentCategory && currentCategory.id !== lastInitializedCategoryId) {
		lastInitializedCategoryId = currentCategory.id;
		initPanorama();
	}

	function switchToScene(sceneId) {
		if (!allScenes[sceneId]) return;
		allScenes[sceneId].scene.switchTo();
		hotspotName.set(sceneId);
		selectedSceneId.set(sceneId);
	}

	function switchCategory(category, sceneId = null) {
		if (currentCategory?.id === category.id) {
			if (sceneId) switchToScene(sceneId);
			return;
		}
		currentCategory = category;
		pendingSceneId = sceneId;
	}

	function getSceneLabel(scene) { return scene.name || scene.id || 'Unnamed Scene'; }
</script>

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
	</SleekSidePanel>
{/if}

<div id="pano" class="absolute inset-0"></div>

<style>
	#pano { width: 100%; height: 100vh; background: black; z-index: 1; }
</style>
