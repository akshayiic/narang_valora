<script>
	import { setContext, getContext } from 'svelte';
	import { writable } from 'svelte/store';
	import 'iconify-icon';
	import poweredByVretail from '$lib/images/powered-vretail.png';
	import instructionIcon from '$lib/images/instruction-icon.svg';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { projectConfig, UIPanel } from '../../stores/ui';

	export let data;

	const currentUI = getContext('currentUI');
	const walkthroughDisabled = getContext('walkthroughDisabled');

	$: customNavSections = Array.isArray($projectConfig?.customSections)
		? $projectConfig.customSections.filter(
				(s) =>
					s?.enabled !== false &&
					(s?.mode === 'dayNightPlus' ||
						(Array.isArray(s?.images) && s.images.length > 0) ||
						!!s?.image ||
						(s?.dayNight && (Array.isArray(s.dayNight.day) || Array.isArray(s.dayNight.evening) || Array.isArray(s.dayNight.night))) ||
						(Array.isArray(s?.catzip) && s.catzip.length > 0) ||
						(Array.isArray(s?.cat24) && s.cat24.length > 0) ||
						(Array.isArray(s?.catstat) && s.catstat.length > 0) ||
						(Array.isArray(s?.categories) && s.categories.length > 0))
			)
		: [];
	
	const getLabel = (conf, key, defaultLabel) => {
		if (conf?.sectionAliases && typeof conf.sectionAliases[key] === 'string' && conf.sectionAliases[key].trim() !== '') {
			return conf.sectionAliases[key].trim();
		}
		return defaultLabel;
	};

	$: defaultSections = [
		{ key: 'overview', label: getLabel($projectConfig, 'overview', 'Overview'), icon: 'overview' },
		{ key: 'amenities', label: getLabel($projectConfig, 'amenities', 'Amenities'), icon: 'amenities' },
		{ key: 'interiors', label: getLabel($projectConfig, 'interiors', 'Interiors'), icon: 'interiors' },
		{ key: 'exterior', label: getLabel($projectConfig, 'exterior', 'Exterior'), icon: 'exterior' },
		{ key: 'vicinities', label: getLabel($projectConfig, 'vicinities', 'Vicinity'), icon: 'vicinities' },
		{ key: 'brochure', label: getLabel($projectConfig, 'brochure', 'Brochure'), icon: 'brochure' }
	];

	$: visibleSections = $projectConfig?.sectionVisibility
		? defaultSections.filter((s) => $projectConfig.sectionVisibility[s.key])
		: [];

	$: firstNavItem = (() => {
		const defaultSecs = visibleSections.map((s) => ({ ...s, isCustom: false, id: s.key }));
		const customSecs = customNavSections.map((s) => ({
			...s,
			isCustom: true,
			label: s.name,
			key: `custom:${s.id}`
		}));

		let allItems = [...defaultSecs, ...customSecs];

		if (Array.isArray($projectConfig?.sectionOrder) && $projectConfig.sectionOrder.length > 0) {
			const orderMap = new Map();
			$projectConfig.sectionOrder.forEach((id, index) => {
				orderMap.set(id, index);
			});

			allItems.sort((a, b) => {
				const idA = a.isCustom ? `custom:${a.id}` : a.id;
				const idB = b.isCustom ? `custom:${b.id}` : b.id;

				const orderA = orderMap.has(idA) ? orderMap.get(idA) : 999999;
				const orderB = orderMap.has(idB) ? orderMap.get(idB) : 999999;

				return orderA - orderB;
			});
		}

		return allItems[0];
	})();

	const instructionPano = writable();
	$: instructionPano.set(true);

	let config = null;
	let project = '';

	function inIframe() {
		try {
			return window.self !== window.top;
		} catch (e) {
			return true;
		}
	}
	let isIframe = inIframe();

	onMount(() => {
		project = $page.params.project;

		// Set up viewport height for mobile
		function setElementHeight() {
			const vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty('--vh', `${vh}px`);
		}
		setElementHeight();

		window.addEventListener('resize', setElementHeight);

		// Double-tap to fullscreen on mobile
		let lastClickTime = 0;
		const clickTimeout = 300;
		if (!(window.self !== window.top) && window.innerWidth < 1200) {
			window.addEventListener('click', () => {
				const now = Date.now();
				if (now - lastClickTime < clickTimeout) {
					if (document.body.requestFullscreen) {
						document.body.requestFullscreen();
					} else if (document.body.webkitRequestFullscreen) {
						/* Safari */
						document.body.webkitRequestFullscreen();
					} else if (document.body.msRequestFullscreen) {
						/* IE11 */
						document.body.msRequestFullscreen();
					}
				}
				lastClickTime = now;
			});
		}

		localStorage.getItem('instructions-view-count') == 4 && instructionPano.set(false);

		// Set UI panel to intro initially
		UIPanel.set('intro');
	});

	setContext('currentUI', currentUI);
</script>

<svelte:head>
	<title>V-Estate</title>
	<meta name="description" content="v-estate" />
</svelte:head>

{#if $UIPanel == 'instructions-exterior' && $currentUI?.Exterior && $walkthroughDisabled}
	<div class="centered-panel instruction-screen p-4">
		<div class="left-panel--header mb-3 flex justify-between">
			<div class="left-title flex flex-col gap-1 text-left">
				<div class="text-2xl font-bold">Instructions</div>
				See how to explore V-estate
			</div>
			<button
				on:click={() => {
					UIPanel.set('loaded');
					!isIframe && localStorage.setItem('instructions-view-count', '4');
				}}
				id="instruction-close"
				class="ghost-btn close-btn !px-0 !pt-0"
			>
				<svg
					width="42"
					height="42"
					viewBox="0 0 42 42"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect
						x="0.363281"
						y="0.319336"
						width="41.5884"
						height="41.5884"
						rx="9.50592"
						fill="#ECECEC"
					/>
					<path
						d="M15.9062 15.8613L26.4104 26.3655"
						stroke="black"
						stroke-width="2.06369"
						stroke-linecap="round"
					/>
					<path
						d="M26.4102 15.8613L15.906 26.3655"
						stroke="black"
						stroke-width="2.06369"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		</div>
		<div class="mb-4 mt-3 grid grid-cols-3 gap-2">
			<div class="col-span-1">
				Navigate and explore around with your mouse. Click on a touchpoint to interact
			</div>
			<div class="col-span-1"><img src={instructionIcon} alt="logo" /></div>
			<div class="col-span-1">
				<div class="mt-[2.75rem]">Use your mouse scroller to zoom an object.</div>
			</div>
		</div>
		<button
			on:click={() => {
				UIPanel.set('instructions-nav');
				!isIframe && localStorage.setItem('instructions-view-count', '1');
			}}
			class="primary-btn mx-auto block w-80"
			id="contact-submit">Okay</button
		>
	</div>
{/if}

{#if $UIPanel == 'intro' && $projectConfig}
	<div
		class="absolute left-0 top-0 z-[2000000000] h-screen w-screen rounded bg-cover bg-center bg-no-repeat"
	>
		<div class="z-[2000000002] h-screen w-screen bg-gradient-to-t from-black">
			{#if $projectConfig?.introImage}
				<div
					class="absolute left-0 top-0 h-screen w-screen bg-cover bg-center bg-no-repeat"
					style="background-image: url('{$projectConfig.introImage}');"
				>
					<div class="h-full w-full bg-gradient-to-t from-black/60 to-transparent"></div>
				</div>
			{:else if $projectConfig?.introVideo}
				<video
					class="intro-video"
					src={$projectConfig.introVideo}
					autoplay
					muted
					loop
					playsinline
					style="width: 100vw; height: 100vh; object-fit: cover; position: absolute; left: 0; top: 0; z-index: -1;"
				></video>
			{:else if $projectConfig?.overviewImages?.day?.[0] || $projectConfig?.overviewImages?.evening?.[0]}
				<div
					class="absolute left-0 top-0 h-screen w-screen bg-cover bg-center bg-no-repeat"
					style="background-image: url('{$projectConfig.overviewImages.defaultMode === 'evening' &&
					$projectConfig.overviewImages.evening?.[0]
						? $projectConfig.overviewImages.evening[
								$projectConfig.overviewImages.initialStartIndexNight - 1 || 0
							]
						: $projectConfig.overviewImages.day[
								$projectConfig.overviewImages.initialStartIndexDay - 1 || 0
							]}');"
				>
					<div class="h-full w-full bg-gradient-to-t from-black/60 to-transparent"></div>
				</div>
			{:else}
				<div
					class="absolute left-0 top-0 flex h-screen w-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800"
				>
					<div class="text-center text-white">
						<svg
							width="80"
							height="80"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							class="mx-auto mb-4 opacity-50"
						>
							<path
								d="M21 6H3C1.89543 6 1 6.89543 1 8V16C1 17.1046 1.89543 18 3 18H21C22.1046 18 23 17.1046 23 16V8C23 6.89543 22.1046 6 21 6Z"
								stroke="white"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<path d="M10 9L15 12L10 15V9Z" fill="white" />
						</svg>
						<h2 class="mb-2 text-2xl font-semibold">Intro Video Not Available</h2>
						<p class="text-gray-400">The intro video for this project is not available.</p>
					</div>
				</div>
			{/if}
			<div
				class="intro center absolute bottom-10 flex w-full flex-col items-center justify-center text-center font-semibold uppercase text-white"
			>
				<button
					id="v-start-btn"
					on:click={() => {
						UIPanel.set('loaded'); // Update UI state to show navbar
						// Navigate to first nav item
						if (firstNavItem) {
							if (firstNavItem.isCustom) {
								goto(`/${project}/custom/${firstNavItem.id}`);
							} else {
								goto(`/${project}/${firstNavItem.id}`);
							}
						}
						
						if (!(window.self !== window.top) && window.innerWidth < 1200) {
							if (document.body.requestFullscreen) {
								document.body.requestFullscreen();
							} else if (document.body.webkitRequestFullscreen) {
								/* Safari */
								document.body.webkitRequestFullscreen();
							} else if (document.body.msRequestFullscreen) {
								/* IE11 */
								document.body.msRequestFullscreen();
							}
						}

						console.log('go fullscreen');
					}}
					class="bg-all-none !w-fit p-0"
				>
					<div id="v-start-img" style="width: 100px;">
						<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
							<!-- Dashed Ring -->
							<circle
								cx="60"
								cy="60"
								r="50"
								fill="none"
								stroke="#FFD400"
								stroke-opacity="0.4"
								stroke-width="1"
								stroke-dasharray="3 3"
								stroke-linecap="round"
							/>

							<!-- Outer Circle -->
							<circle cx="60" cy="60" r="40" fill="white" fill-opacity="0.15" />

							<!-- Inner Circle -->
							<circle cx="60" cy="60" r="30" fill="white" />

							<!-- Perfectly Centered Arrow -->
							<svg x="47" y="47" width="26" height="26" viewBox="18 17 12 12">
								<path
									d="M28.7346 22.4444C29.1922 22.6798 29.1922 23.3341 28.7346 23.5695L20.3792 27.8679C19.8453 28.1425 19.2649 27.5886 19.5143 27.0425L21.2373 23.2698C21.3136 23.1029 21.3136 22.9111 21.2373 22.7441L19.5143 18.9714C19.2649 18.4253 19.8453 17.8714 20.3792 18.146L28.7346 22.4444Z"
									fill="var(--primary-color)"
								/>
							</svg>
						</svg>
					</div>
				</button>

				<div class="title text-2xl">virtual tour experience</div>
				<div class="subtitle uppercase">by {$projectConfig?.orgName}</div>
			</div>
		</div>
	</div>
{#if $projectConfig?.collabToolEnabled && $projectConfig?.orgName !== 'L&T Realty'}
  <img
    src={poweredByVretail}
    alt="Powered by Vretail"
    class="absolute bottom-5 right-6 z-[2000000002]"
    loading="lazy"
    decoding="async"
  />
{/if}

{#if $projectConfig?.vstateWatermark}
		<img
		src="/vestate-iic.png"
		alt="powered by vretail"
		class="absolute bottom-5 right-6 z-[2000000002]"
    loading="lazy"
    decoding="async"
	/>
{/if}

{/if}

<style>
	button {
		background-size: 100% 100%;
		background-repeat: no-repeat;
		padding: 1rem 0.5rem;
		font-size: 1rem;
		border: 0;
	}

	.centered-panel {
		border-radius: 0.8rem;
		position: absolute;
		bottom: 2rem;
		z-index: 99;
		transform-origin: center;
		top: 0;
		left: 0;
		width: 500px;
		height: fit-content;
		right: 0;
		bottom: 0;
		margin: auto;
		background-color: #fff;
		flex-wrap: wrap;
	}
	.instruction-screen {
		width: 600px;

		z-index: 9999999999;
	}

	/* shrink the play button in mobile landscape only */
	@media (orientation: landscape) and (max-height: 600px) {
		#v-start-img {
			width: 60px !important;
		}
		#v-start-img svg {
			width: 60px;
			height: 60px;
		}
	}
</style>
