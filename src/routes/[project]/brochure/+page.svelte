<script>
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import minimizeBtn from '$lib/images/minimize-icon.svg';
	import maximizeBtn from '$lib/images/maximize-icon.svg';
	import { slide } from 'svelte/transition';
	import { projectConfig, navSlide } from '../../../stores/ui';
	import SectionFallback from '$lib/components/SectionFallback.svelte';
	import SleekSidePanel from '$lib/components/ui/sleek/SleekSidePanel.svelte';
	import SleekAccordion from '$lib/components/ui/sleek/SleekAccordion.svelte';
	import SleekButton from '$lib/components/ui/sleek/SleekButton.svelte';

	$: config = $projectConfig;
	$: isSectionVisible = config?.sectionVisibility?.brochure;

	// Dynamic data from config
	let brochureItems = [];
	let currentItem = null;
	let currentAssetIndex = 0;

	$: brochureConfig = $projectConfig?.brochureSection?.items ?? [];

	// State
	const isAmenitiesMinimized = writable(false);

	const pageNumber = writable(1);
	const isFullscreen = writable(false);
	const showHint = writable(false);

	let mouseX = 0;
	let mouseY = 0;
	let walkthroughVideo;
	let walkthroughVid;
	let time = 0;
	let duration;
	let paused = true;
	let showControls = true;
	let showControlsTimeout;
	let lastMouseDown;


	// Update brochure items when config changes
	$: if (brochureConfig.length > 0) {
		// Sort items by order without mutating the original array
		const sortedItems = [...brochureConfig].sort((a, b) => (a.order || 0) - (b.order || 0));
		
		// Only update if items have actually changed or haven't been loaded yet
		if (JSON.stringify(sortedItems) !== JSON.stringify(brochureItems)) {
			brochureItems = sortedItems;
			
			// Auto-select first item only if none selected or if the list changed
			if (brochureItems.length > 0 && (!currentItem || !brochureItems.find(item => item.id === currentItem.id))) {
				selectItem(brochureItems[0]);
			}
		}
	}

	// Select a brochure item
	function selectItem(item) {
		if (!item) return;
		currentItem = item;
		currentAssetIndex = 0;
		pageNumber.set(1);
	}

	// Get total pages for current item
	function getTotalPages() {
		if (!currentItem) return 0;
		if (currentItem.type === 'video') return 1;
		return currentItem.assets?.length || 0;
	}

	// Navigation functions
	function nextPage() {
		const totalPages = getTotalPages();
		if ($pageNumber < totalPages) {
			const newPage = $pageNumber + 1;
			pageNumber.set(newPage);
			currentAssetIndex = newPage - 1;
		}
	}

	function prevPage() {
		if ($pageNumber > 1) {
			const newPage = $pageNumber - 1;
			pageNumber.set(newPage);
			currentAssetIndex = newPage - 1;
		}
	}

	// Get current asset URL (reactive)
	$: currentAssetUrl = (() => {
		if (!currentItem) return '';
		if (currentItem.type === 'video') {
			return currentItem.assets?.[0]?.url || '';
		}
		return currentItem.assets?.[currentAssetIndex]?.url || '';
	})();

	// Event handlers
	function handleMouseMove(event) {
		mouseX = event.clientX + 15;
		mouseY = event.clientY + 15;
	}

	function handleMove(e) {
		clearTimeout(showControlsTimeout);
		showControlsTimeout = setTimeout(() => (showControls = false), 2500);
		showControls = true;

		if (!duration) return;
		if (e.type !== 'touchmove' && !(e.buttons & 1)) return;

		const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
		const { left, right } = e.currentTarget.getBoundingClientRect();
		time = (duration * (clientX - left)) / (right - left);
	}

	function handleMousedown() {
		lastMouseDown = new Date();
	}

	function handleMouseup() {
		if (new Date() - lastMouseDown < 300) {
			if (walkthroughVid.paused) {
				walkthroughVid.play();
			} else {
				walkthroughVid.pause();
			}
		}
	}

	function format(seconds) {
		if (isNaN(seconds)) return '...';

		const minutes = Math.floor(seconds / 60);
		seconds = Math.floor(seconds % 60);
		if (seconds < 10) seconds = '0' + seconds;

		return `${minutes}:${seconds}`;
	}

	// Load items on mount
	onMount(() => {
		// Initialization is handled by the reactive brochureConfig block
	});
</script>

{#if !config || Object.keys(config).length === 0 || !isSectionVisible}
	<SectionFallback />
{:else}
	<!-- Pagination for image brochures -->
	{#if currentItem && currentItem.type === 'image' && getTotalPages() > 1}
		<div
			class="user-select-none fixed left-0 right-0 top-5 z-[999] mb-2 flex items-center justify-center gap-3"
			style="background: white; width: fit-content; margin: auto; padding: 0.7rem; border-radius: 1rem;"
		>
			<div id="pdf-prev" class="grid w-fit grid-cols-1 gap-2">
				<button
					on:click={prevPage}
					class="primary-btn px-3 py-1"
					disabled={$pageNumber === 1}>Previous</button
				>
			</div>
			<span class="flex gap-2 text-xl font-bold">
				<span id="page_num">{$pageNumber}</span> /
				<span id="page_count">{getTotalPages()}</span>
			</span>
			<div id="pdf-next" class="ms-2 grid w-fit grid-cols-1 gap-2">
				<button
					on:click={nextPage}
					class="primary-btn px-4 py-1"
					disabled={$pageNumber === getTotalPages()}>Next</button
				>
			</div>
		</div>
	{/if}

	<!-- Main Content Area -->
	{#if currentItem}
		<div class="centered-panel brochure-panel my-0 !h-screen !w-screen !bg-[#000000a6] backdrop-blur-md">
			<div id="brochure-img-wrapper">
				{#if currentItem.type === 'video'}
					<div class="video-container" bind:this={walkthroughVideo}>
						<video
							bind:this={walkthroughVid}
							src={currentAssetUrl}
							autoplay
							class="video absolute top-0 h-full w-full object-cover cursor-pointer bg-black"
							on:click={() => {
								if (walkthroughVideo.requestFullscreen) {
									walkthroughVideo.requestFullscreen();
									isFullscreen.set(true);
								}
							}}
							on:play={() => {
								navSlide.set(true);
								isAmenitiesMinimized.set(true);
							}}
							on:pause={() => {
								navSlide.set(false);
								isAmenitiesMinimized.set(false);
							}}
							loop
							on:mouseenter={() => showHint.set(true)}
							on:mouseleave={() => showHint.set(false)}
							on:mousemove={handleMove}
							on:touchmove={(e) => {
								e.preventDefault();
								handleMove(e);
							}}
							on:mousedown={handleMousedown}
							on:mouseup={handleMouseup}
							bind:currentTime={time}
							bind:duration
							bind:paused
							on:mousemove={handleMouseMove}
						>
							<track kind="captions" />
						</video>
						{#if $isFullscreen}
							<div class="controls">
								<progress value={time / duration || 0}></progress>

								<div class="info">
									<span class="time">{format(time)}</span>
									<span>click anywhere to {paused ? 'play' : 'pause'} / drag to seek</span>
									<span class="time">{format(duration)}</span>
								</div>
							</div>
						{/if}
						{#if $isFullscreen}
							<button
								class="exit-btn"
								on:click={() => {
									document.exitFullscreen();
									isFullscreen.set(false);
								}}
								on:keydown={(e) => {
									if (e.key === 'Escape' && $isFullscreen) {
										document.exitFullscreen();
										isFullscreen.set(false);
									}
								}}
							>
								⬅ Back
							</button>
						{/if}
					</div>

					{#if $showHint}
						<div class="video-hint" style="top:{mouseY}px; left:{mouseX}px;">
							Click to go fullscreen
						</div>
					{/if}
				{:else}
					<img
						class="mx-auto"
						style="width: auto; height: 100vh;"
						src={currentAssetUrl}
						alt="{currentItem.label} - Page {$pageNumber}"
					/>
				{/if}
			</div>
		</div>
	{/if}

	<SleekSidePanel 
		isRightSidebar={config?.navStyle === 'sidebar'} 
		title={$projectConfig?.sectionAliases?.brochure?.trim() || 'Brochures'}
		iconName="book-open"
		isMinimized={$isAmenitiesMinimized}
		toggleMinimize={() => $isAmenitiesMinimized = !$isAmenitiesMinimized}
	>
		<!-- SLEEK SIDEBAR CONTENT -->
		<SleekAccordion title="Available Brochures" isOpen={true}>
			{#if brochureItems.length > 0}
				{#each brochureItems as item}
					<SleekButton
						active={currentItem?.id === item.id}
						onClick={() => selectItem(item)}
					>
						{item.label || item.id}
					</SleekButton>
				{/each}
			{:else}
				<p class="p-2 text-sm text-white/50">Loading brochures...</p>
			{/if}
		</SleekAccordion>

		<!-- THEME FALLBACK CONTENT -->
		<svelte:fragment slot="fallback">
			<div class="left-panel p-2">
				<div class="left-panel--header flex justify-between gap-[2rem]">
					<div class="left-title flex items-center font-bold">
						<svg
							width="18"
							height="18"
							viewBox="0 0 15 16"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							class="mr-2"
						>
							<path
								d="M8.77946 3.83378C8.77946 4.79841 8.78543 5.76304 8.7735 6.73358C8.76753 6.96438 8.84509 7.01173 9.05988 7.00581C9.56701 6.98806 10.0741 7.00581 10.5813 6.99989C10.8199 6.99989 11.0108 7.05907 11.1182 7.28396C11.2256 7.52067 11.1242 7.69821 10.9691 7.87575C9.90111 9.08302 8.83913 10.2962 7.77117 11.5035C7.48479 11.829 7.21035 11.823 6.918 11.4975C5.85005 10.2903 4.78209 9.0771 3.72011 7.86983C3.56498 7.69821 3.46952 7.50884 3.58288 7.27804C3.69624 7.05315 3.89313 6.99397 4.12581 6.99989C4.63294 7.00581 5.14007 6.98806 5.6472 7.00581C5.87988 7.01173 5.92164 6.94071 5.92164 6.72175C5.91568 4.828 5.91568 2.93425 5.91568 1.04642C5.91568 0.507884 6.0529 0.371771 6.60776 0.371771C7.14472 0.371771 7.68168 0.365853 8.21864 0.371771C8.60644 0.377689 8.77946 0.54931 8.77946 0.933978C8.77946 1.90452 8.77946 2.86915 8.77946 3.83378Z"
								fill="var(--primary-color)"
							/>
							<path
								d="M7.31128 15.5257C5.31259 15.5257 3.31391 15.5257 1.32119 15.5257C0.551547 15.5257 0.187607 15.1706 0.187607 14.4072C0.187607 13.2828 0.193573 12.1584 0.181641 11.034C0.181641 10.8446 0.223404 10.7736 0.426256 10.7854C0.903554 10.7973 1.38085 10.7973 1.85815 10.7854C2.061 10.7795 2.10276 10.8505 2.10276 11.034C2.09083 11.8152 2.10873 12.5904 2.0968 13.3716C2.09083 13.5787 2.15049 13.632 2.35931 13.632C5.68847 13.6261 9.01762 13.6261 12.3468 13.632C12.5675 13.632 12.6033 13.561 12.6033 13.3657C12.5914 12.5845 12.6033 11.8092 12.5974 11.0281C12.5974 10.8328 12.657 10.7795 12.8479 10.7854C13.3372 10.7973 13.8204 10.7973 14.3097 10.7854C14.4588 10.7854 14.5185 10.8209 14.5185 10.9807C14.5125 12.1821 14.5244 13.3834 14.5125 14.5907C14.5065 15.1588 14.0829 15.5257 13.4684 15.5257C11.4101 15.5257 9.36366 15.5257 7.31128 15.5257Z"
								fill="var(--primary-color)"
							/>
						</svg>
						{$projectConfig?.sectionAliases?.brochure?.trim() || 'Brochures'}
					</div>
					<button
						on:click={() => {
							$isAmenitiesMinimized = !$isAmenitiesMinimized;
						}}
						class="ghost-btn close-btn !px-0 !py-0"
						id="minimize-toggle-vicinity"
					>
						{#if !$isAmenitiesMinimized}
							<img src={minimizeBtn} alt="minimize" />
						{/if}
						{#if $isAmenitiesMinimized}
							<img src={maximizeBtn} alt="maximize" />
						{/if}
					</button>
				</div>
				<div
					class={!$isAmenitiesMinimized ? 'block' : 'hidden'}
					isInteriorUnitDataMinimized
					transition:slide={{ duration: 800, axis: 'y' }}
				>
					<div class="no-hovers pt-3">
						<div class="inner-btn-group">
							{#if brochureItems.length > 0}
								{#each brochureItems as item}
									<button
										on:click={() => selectItem(item)}
										class="inner-modal-btn !w-full {currentItem?.id === item.id ? 'active' : ''}"
										id={item.id}
									>
										{item.label || item.id}
									</button>
								{/each}
							{:else}
								<p class="p-2 text-sm text-gray-500">Loading brochures...</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</svelte:fragment>
	</SleekSidePanel>
{/if}

<style>
	.video-hint {
		position: fixed;
		background: rgba(0, 0, 0, 0.75);
		color: white;
		padding: 6px 10px;
		border-radius: 4px;
		font-size: 14px;
		pointer-events: none;
		z-index: 999999999;
		white-space: nowrap;
	}

	.exit-btn {
		position: absolute;
		top: 20px;
		left: 20px;
		padding: 10px 18px;
		background: rgba(131, 128, 128, 0.7);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 18px;
		z-index: 9999999999;
	}

	.controls {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.5);
		color: white;
		transition: opacity 0.3s;
	}
	progress {
		width: 100%;
	}
	.info {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
	}

	/* progress::-webkit-progress-bar {
		background-color: #222;
		border-radius: 4px;
	} */

	progress::-webkit-progress-value {
		background-color: var(--primary-color);
		border-radius: 4px;
	}
</style>
