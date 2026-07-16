<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { writable, get } from 'svelte/store';
	import { hotspotName, projectConfig } from '../../../stores/ui';
	import * as Accordion from '$lib/components/ui/accordion';
	import minimizeBtn from '$lib/images/minimize-icon.svg';
	import maximizeBtn from '$lib/images/maximize-icon.svg';
	import { fade, slide } from 'svelte/transition';
	import Icon from '$lib/components/Icon.svelte';
	import SectionFallback from '$lib/components/SectionFallback.svelte';
	import SleekSidePanel from '$lib/components/ui/sleek/SleekSidePanel.svelte';
	import SleekAccordion from '$lib/components/ui/sleek/SleekAccordion.svelte';
	import SleekButton from '$lib/components/ui/sleek/SleekButton.svelte';

	let viewer;
	let Marzipano;
	let unsubscribeHotSpot;
	let unsubscribeViewChange;
	let mounted = false;

	const isInteriorsMinimized = writable(false);
	const isbhklist = writable(false);
	const currentbhk = writable('');
	const startTour = writable(false);

	$: config = $projectConfig;
	$: interiorsConfig = $projectConfig?.interiors?.categories ?? [];
	$: isSectionVisible = config?.sectionVisibility?.interiors;

	// Track the current selected category
	let currentCategory = null;
	let pendingSceneId = null;

	$: dataJson = currentCategory?.zipUrl ? `${currentCategory.zipUrl}/data.json` : null;
	$: tilesFolder = currentCategory?.zipUrl ? `${currentCategory.zipUrl}/tiles` : null;
	$: dollhouseImage = currentCategory?.dollhouseImage || null;

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
		if (!interiorsConfig || interiorsConfig.length === 0) return;

		const categoriesData = await Promise.all(
			interiorsConfig.map(async (category) => {
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
		const validCategories = categoriesData.filter((cat) => cat !== null);
		categoriesWithScenes.set(validCategories);

		// Auto-select first category if none selected
		if (!currentCategory && validCategories.length > 0) {
			currentCategory = validCategories[0];
			currentbhk.set(validCategories[0].name);
			// Set initial hotspot to first scene
			if (validCategories[0].scenes && validCategories[0].scenes.length > 0) {
				hotspotName.set(validCategories[0].scenes[0].id);
			}
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
			const label =
				hotspot.name || (targetScene ? getSceneLabel(targetScene) : hotspot.target) || 'Area Label';

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
		let targetSceneId =
			pendingSceneId && allScenes[pendingSceneId] ? pendingSceneId : appData.scenes[0].id;

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
						// hotspotWrapper.style.transform = resetNegativeTranslations(
						// 	hotspotWrapper.style.transform,
						// 	hotspotElement
						// );
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

	// Reload categories data when config changes
	$: if (mounted && interiorsConfig.length > 0) {
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

	// Switch BHK type dynamically
	function switchBHK(category) {
		if (get(currentbhk) === category.name) {
			isbhklist.set(false);
			return;
		}
		currentbhk.set(category.name);
		startTour.set(false);
		isbhklist.set(false);
		currentCategory = category;

		// Set initial hotspot to first scene of the category
		if (category.scenes && category.scenes.length > 0) {
			hotspotName.set(category.scenes[0].id);
		}
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
	<!-- Dollhouse View -->
	{#if dollhouseImage && !$startTour}
		<div class="dollhouse-wrapper z-[9]" transition:fade>
			<img src={dollhouseImage} id="dollhouse" class="" alt="Dollhouse - {currentCategory?.name}" fetchpriority="high" decoding="async" />
			<button
				id="start-tour"
				class="primary-btn mx-auto mt-[-1rem]"
				on:click={() => startTour.set(true)}
			>
				<svg
					id="start-tour-img"
					width="47"
					height="46"
					viewBox="0 0 47 46"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<circle opacity="0.15" cx="23.6113" cy="23.0068" r="22.6963" fill="white" />
					<circle cx="23.6111" cy="23.0071" r="16.8816" fill="white" />
					<path
						d="M28.7346 22.4444C29.1922 22.6798 29.1922 23.3341 28.7346 23.5695L20.3792 27.8679C19.8453 28.1425 19.2649 27.5886 19.5143 27.0425L21.2373 23.2698C21.3136 23.1029 21.3136 22.9111 21.2373 22.7441L19.5143 18.9714C19.2649 18.4253 19.8453 17.8714 20.3792 18.146L28.7346 22.4444Z"
						fill="url(#paint0_linear_99_267)"
					/>
					<defs>
						<linearGradient
							id="paint0_linear_99_267"
							x1="20.2666"
							y1="17.3999"
							x2="24.2452"
							y2="27.0141"
							gradientUnits="userSpaceOnUse"
						>
							<stop stop-color="var(--primary-color)" />
							<stop offset="1" stop-color="var(--primary-color-light)" />
						</linearGradient>
					</defs>
				</svg>
				Start Tour
			</button>
		</div>
	{/if}

	<!-- Dynamic BHK Selector -->
	<div class="bhk-selector fixed right-5 top-24 z-[1111] mt-16">
		<div class="relative w-fit">
			<div class=" ">
				<div class="rounded-xl bg-white p-2">
					<div class="    ">
						<div class="left-panel--header flex justify-between gap-[2rem] lg:gap-[5rem]">
							<div class="left-title flex items-center font-bold">
								<svg
									class="ml-1 mr-2 h-auto sm:!w-4 lg:!w-6"
									width="17"
									height="17"
									viewBox="0 0 17 17"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M8.68982 16.9237C6.64273 16.9237 4.59877 16.9144 2.55168 16.9299C2.14038 16.9331 1.87036 16.6185 1.87036 16.2479C1.8735 14.426 1.8735 12.6042 1.8735 10.7823C1.8735 9.80127 1.8735 8.82026 1.8735 7.83925C1.8735 7.78319 1.90176 7.70845 1.85152 7.67731C1.80129 7.64616 1.75419 7.71468 1.7071 7.74271C1.40255 7.93891 1.09799 8.13823 0.790301 8.33443C0.755764 8.35623 0.708668 8.38737 0.680411 8.37803C0.627036 8.35934 0.649014 8.29706 0.649014 8.25346C0.649014 7.61502 0.649014 6.97659 0.645874 6.33815C0.645874 6.23538 0.683551 6.17621 0.765183 6.12326C1.87664 5.3914 2.9881 4.65953 4.1027 3.93078C4.74634 3.50723 5.38998 3.0868 6.03363 2.66637C6.86879 2.11825 7.70709 1.57636 8.53912 1.02512C8.65529 0.947263 8.74634 0.950378 8.86251 1.02824C9.60348 1.5203 10.3476 2.00613 11.0917 2.49197C12.4512 3.38578 13.8138 4.27958 15.1733 5.17028C15.6569 5.48794 16.1372 5.8056 16.6239 6.11703C16.7181 6.17621 16.7558 6.24472 16.7526 6.35684C16.7463 6.98593 16.7495 7.61191 16.7495 8.241C16.7495 8.28771 16.7683 8.35 16.7275 8.3718C16.6773 8.40294 16.6333 8.34689 16.5925 8.31886C16.2817 8.11954 15.974 7.91711 15.6631 7.71779C15.6286 7.69599 15.5878 7.63994 15.5438 7.67108C15.5218 7.68665 15.525 7.74894 15.525 7.78942C15.525 9.21578 15.525 10.6421 15.525 12.0716C15.525 13.4668 15.5187 14.862 15.5281 16.2604C15.5313 16.6247 15.211 16.9237 14.8562 16.9237C12.7997 16.9175 10.7432 16.9237 8.68982 16.9237ZM8.70238 15.6562C10.4795 15.6562 12.2597 15.6562 14.0368 15.6562C14.244 15.6562 14.244 15.6562 14.244 15.4506C14.244 12.6135 14.244 9.77324 14.2471 6.9361C14.2471 6.82087 14.2032 6.7617 14.1121 6.70253C13.3649 6.21981 12.6207 5.73397 11.8798 5.24502C10.8594 4.57545 9.83582 3.90275 8.81855 3.23006C8.73064 3.17089 8.66785 3.174 8.58307 3.23317C8.18119 3.50412 7.77617 3.76572 7.37114 4.03044C6.00537 4.92425 4.63959 5.82117 3.27382 6.71187C3.18276 6.77104 3.15451 6.83644 3.15765 6.94233C3.16079 9.77013 3.16079 12.5979 3.16079 15.4257C3.16079 15.6593 3.16079 15.6593 3.40254 15.6593C5.16392 15.6562 6.93158 15.6562 8.70238 15.6562Z"
										fill="var(--primary-color)"
									/>
									<path
										d="M11.1368 15.0858C11.0897 15.0858 11.0426 15.0858 10.9955 15.0858C10.6125 15.0858 10.4994 14.9861 10.4838 14.6155C10.4775 14.4847 10.399 14.494 10.3142 14.494C9.61719 14.494 8.92331 14.494 8.2263 14.494C7.84325 14.494 7.46334 14.4972 7.0803 14.4909C6.95471 14.4878 6.91703 14.5314 6.92017 14.6529C6.92331 14.9425 6.77261 15.0858 6.47747 15.0858C6.31421 15.0858 6.15408 15.0889 5.99082 15.0858C5.7679 15.0826 5.59835 14.9207 5.58266 14.6996C5.58266 14.6778 5.57952 14.6591 5.58266 14.6373C5.62661 14.3041 5.5544 14.0269 5.30008 13.7715C5.08658 13.5566 5.00809 13.2545 4.98611 12.9462C4.97983 12.8434 4.96413 12.7407 4.95785 12.6379C4.95471 12.5818 4.91704 12.56 4.87308 12.5351C4.4712 12.3265 4.30479 12.0088 4.36131 11.5479C4.40212 11.2022 4.73179 10.8565 5.10228 10.7693C5.60463 10.6541 6.13211 10.9998 6.23572 11.5012C6.27339 11.6787 6.24827 11.8624 6.29537 12.04C6.40526 12.4542 6.58422 12.5974 7.02065 12.5974C8.13838 12.5974 9.25926 12.5974 10.377 12.5974C10.8762 12.5974 11.0803 12.4137 11.1368 11.8375C11.1619 11.5884 11.1776 11.3455 11.3409 11.1368C11.5732 10.8378 11.8746 10.7133 12.2451 10.7631C12.5874 10.8098 12.8323 11.0122 12.9704 11.3143C13.1588 11.7285 13.0552 12.3078 12.5277 12.532C12.4461 12.5663 12.4524 12.6317 12.4461 12.7002C12.4241 13.0801 12.355 13.4507 12.107 13.7591C12.0473 13.8307 12.0002 13.9241 11.9249 13.9708C11.7648 14.0705 11.7459 14.2106 11.7553 14.3726C11.7616 14.5034 11.7585 14.6311 11.7585 14.7619C11.7553 14.9612 11.6392 15.0764 11.4351 15.0826C11.3346 15.0889 11.2341 15.0889 11.1368 15.0858Z"
										fill="var(--primary-color)"
									/>
									<path
										d="M8.7684 8.36811C9.39634 8.36811 10.0243 8.37434 10.6522 8.36811C11.5784 8.35565 12.445 9.14357 12.4795 10.0623C12.4795 10.0872 12.4827 10.1152 12.4921 10.1402C12.5204 10.2305 12.4984 10.2647 12.3948 10.2492C12.0149 10.1869 11.6538 10.2585 11.3304 10.4609C10.9191 10.7163 10.7056 11.0963 10.6585 11.5727C10.6522 11.6288 10.6459 11.6849 10.6365 11.7409C10.5832 12.0368 10.5832 12.0368 10.288 12.0368C9.21424 12.0368 8.14359 12.0368 7.06981 12.0368C6.85631 12.0368 6.85945 12.0368 6.83747 11.8281C6.80294 11.498 6.77154 11.1679 6.56118 10.8876C6.20325 10.4142 5.74485 10.162 5.13261 10.246C5.04469 10.2585 5.01958 10.2305 5.02272 10.1495C5.05097 9.6699 5.23308 9.25258 5.56903 8.91312C5.8987 8.57988 6.30372 8.38057 6.77782 8.37122C7.4403 8.35877 8.10592 8.36811 8.7684 8.36811Z"
										fill="var(--primary-color)"
									/>
								</svg>
								<span class="font-semibold">
									{$currentbhk || 'Select Type'}
								</span>
							</div>
							<button
								on:click={() => {
									$isbhklist = !$isbhklist;
								}}
								class="ghost-btn close-btn !px-0 !py-0"
								id="minimize-toggle-vicinity"
							>
								{#if !$isbhklist}
									<img src={minimizeBtn} alt="minimize" class="sm:w-5 lg:w-full" />
								{/if}
								{#if $isbhklist}
									<img src={maximizeBtn} alt="maximize" class="sm:w-5 lg:w-full" />
								{/if}
							</button>
						</div>

						<div class={!$isbhklist ? 'block' : 'hidden'}>
							<div class="no-hovers pt-3">
								<div class=" ">
									<Accordion.Root class="w-full sm:max-w-full">
										<Accordion.Item value="item-12" class="none ">
											<Accordion.Trigger id="grolevel-fx">Select BHK Type</Accordion.Trigger>
										</Accordion.Item>
										<div class="flex flex-col gap-2 bg-white py-2">
											{#each $categoriesWithScenes as category}
												<button
													class={$currentbhk === category.name
														? 'active inner-modal-btn'
														: 'inner-modal-btn'}
													on:click={() => switchBHK(category)}
												>
													{category.name}
												</button>
											{/each}
										</div>
									</Accordion.Root>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	{#if $startTour}
		<SleekSidePanel 
			isRightSidebar={config?.navStyle === 'sidebar'} 
			title={$projectConfig?.sectionAliases?.interiors?.trim() || 'Interior Unit'}
			iconName="interiors"
			isMinimized={$isInteriorsMinimized}
			toggleMinimize={() => $isInteriorsMinimized = !$isInteriorsMinimized}
		>
			<!-- SLEEK SIDEBAR CONTENT -->
			{#if currentCategory && currentCategory.scenes}
				<SleekAccordion title="Top Level" isOpen={true}>
					{#each currentCategory.scenes as scene}
						<SleekButton
							active={$hotspotName == scene.id}
							onClick={() => switchToScene(scene.id)}
						>
							{getSceneLabel(scene)}
						</SleekButton>
					{/each}
				</SleekAccordion>
			{/if}

			<!-- THEME FALLBACK CONTENT -->
			<svelte:fragment slot="fallback">
				<div class="left-panel p-2">
					<div class="left-panel--header flex justify-between gap-[1rem] lg:gap-[3rem]">
						<div class="left-title flex items-center font-bold">
							<Icon name="interiors" size={25} class="mr-2" />
							<span class="sm:text-[0.6rem] lg:text-[1rem]"> {$projectConfig?.sectionAliases?.interiors?.trim() || 'Interior Unit'} </span>
						</div>
						<button
							on:click={() => {
								$isInteriorsMinimized = !$isInteriorsMinimized;
							}}
							class="ghost-btn close-btn !px-0 !py-0"
							id="interior-toggle-amenities"
						>
							{#if !$isInteriorsMinimized}
								<img id="mm-am-btn" src={minimizeBtn} alt="minimize" class="sm:w-5 lg:w-full" />
							{/if}
							{#if $isInteriorsMinimized}
								<img id="mx-am-btn" src={maximizeBtn} alt="maximize" class="sm:w-5 lg:w-full" />
							{/if}
						</button>
					</div>

					<div class={!$isInteriorsMinimized ? 'block' : 'hidden'}>
						<div class="no-hovers pt-3">
							<div class="inner-btn-group">
								<Accordion.Root class="w-full sm:max-w-full">
									<Accordion.Item value="item-12" class="none">
										<Accordion.Trigger id="grolevel-fx">Top Level</Accordion.Trigger>
									</Accordion.Item>

									{#if currentCategory && currentCategory.scenes}
										{#each currentCategory.scenes as scene}
											<button
												class={$hotspotName == scene.id
													? 'active inner-modal-btn'
													: 'inner-modal-btn'}
												id={'-am' + scene.id + '-am'}
												on:click={() => switchToScene(scene.id)}
											>
												<span class="sm:text-[0.6rem] lg:text-[0.8rem]">
													{getSceneLabel(scene)}
												</span>
											</button>
										{/each}
									{/if}
								</Accordion.Root>
							</div>
						</div>
					</div>
				</div>
			</svelte:fragment>
		</SleekSidePanel>
	{/if}

	<!-- Panorama Viewer -->
	<div id="pano"></div>
{/if}

<style>
</style>
