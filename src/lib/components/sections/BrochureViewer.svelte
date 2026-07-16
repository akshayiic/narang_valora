<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { slide } from 'svelte/transition';
	import { navSlide } from '../../../stores/ui';
	import SectionFallback from '$lib/components/SectionFallback.svelte';
	import SleekSidePanel from '$lib/components/ui/sleek/SleekSidePanel.svelte';
	import SleekAccordion from '$lib/components/ui/sleek/SleekAccordion.svelte';
	import SleekButton from '$lib/components/ui/sleek/SleekButton.svelte';

	export let config;
	export let sectionId;
	export let brochureConfig = [];

	$: isSectionVisible = config?.sectionVisibility?.[sectionId];

	let brochureItems = [];
	let currentItem = null;
	let currentAssetIndex = 0;

	const isMinimized = writable(false);
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

	$: if (brochureConfig.length > 0) {
		const sortedItems = [...brochureConfig].sort((a, b) => (a.order || 0) - (b.order || 0));
		if (JSON.stringify(sortedItems) !== JSON.stringify(brochureItems)) {
			brochureItems = sortedItems;
			if (
				brochureItems.length > 0 &&
				(!currentItem || !brochureItems.find((item) => item.id === currentItem.id))
			) {
				selectItem(brochureItems[0]);
			}
		}
	}

	function selectItem(item) {
		if (!item) return;
		currentItem = item;
		currentAssetIndex = 0;
		pageNumber.set(1);
	}

	function getTotalPages() {
		if (!currentItem) return 0;
		if (currentItem.type === 'video') return 1;
		return currentItem.assets?.length || 0;
	}

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

	$: currentAssetUrl = (() => {
		if (!currentItem) return '';
		if (currentItem.type === 'video') return currentItem.assets?.[0]?.url || '';
		return currentItem.assets?.[currentAssetIndex]?.url || '';
	})();

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
			if (walkthroughVid.paused) walkthroughVid.play();
			else walkthroughVid.pause();
		}
	}

	function format(seconds) {
		if (isNaN(seconds)) return '...';
		const minutes = Math.floor(seconds / 60);
		seconds = Math.floor(seconds % 60);
		if (seconds < 10) seconds = '0' + seconds;
		return `${minutes}:${seconds}`;
	}
</script>

{#if !config || Object.keys(config).length === 0 || !isSectionVisible}
	<SectionFallback />
{:else}
	{#if currentItem && currentItem.type === 'image' && getTotalPages() > 1}
		<div
			class="user-select-none fixed left-0 right-0 top-5 z-[999] mb-2 flex items-center justify-center gap-3"
			style="background: white; width: fit-content; margin: auto; padding: 0.7rem; border-radius: 1rem;"
		>
			<div class="grid w-fit grid-cols-1 gap-2">
				<button on:click={prevPage} class="primary-btn px-3 py-1" disabled={$pageNumber === 1}
					>Previous</button
				>
			</div>
			<span class="flex gap-2 text-xl font-bold">
				<span>{$pageNumber}</span> / <span>{getTotalPages()}</span>
			</span>
			<div class="ms-2 grid w-fit grid-cols-1 gap-2">
				<button
					on:click={nextPage}
					class="primary-btn px-4 py-1"
					disabled={$pageNumber === getTotalPages()}>Next</button
				>
			</div>
		</div>
	{/if}

	{#if currentItem}
		<div
			class="centered-panel brochure-panel my-0 !h-screen !w-screen !bg-[#000000a6] backdrop-blur-md"
		>
			<div id="brochure-img-wrapper" class="flex h-full w-full items-center justify-center">
				{#if currentItem.type === 'video'}
					<div class="video-container relative h-full w-full" bind:this={walkthroughVideo}>
						<video
							bind:this={walkthroughVid}
							src={currentAssetUrl}
							autoplay
							class="video absolute top-0 h-full w-full cursor-pointer bg-black object-cover"
							on:click={() => {
								if (walkthroughVideo.requestFullscreen) {
									walkthroughVideo.requestFullscreen();
									isFullscreen.set(true);
								}
							}}
							on:play={() => {
								navSlide.set(true);
								isMinimized.set(true);
							}}
							on:pause={() => {
								navSlide.set(false);
								isMinimized.set(false);
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
							<div class="controls absolute bottom-0 w-full bg-black/50 p-2 text-white">
								<progress value={time / duration || 0} class="w-full"></progress>
								<div class="info flex justify-between">
									<span>{format(time)}</span>
									<span>click anywhere to {paused ? 'play' : 'pause'} / drag to seek</span>
									<span>{format(duration)}</span>
								</div>
							</div>
							<button
								class="exit-btn absolute left-5 top-5 rounded bg-black/70 px-4 py-2 text-white"
								on:click={() => {
									document.exitFullscreen();
									isFullscreen.set(false);
								}}>⬅ Back</button
							>
						{/if}
					</div>
					{#if $showHint}
						<div class="video-hint" style="top:{mouseY}px; left:{mouseX}px;">
							Click to go fullscreen
						</div>
					{/if}
				{:else}
					<img
						class="mx-auto h-full object-contain"
						src={currentAssetUrl}
						alt="{currentItem.label} - Page {$pageNumber}"
					/>
				{/if}
			</div>
		</div>
	{/if}

	<SleekSidePanel
		isRightSidebar={true}
		title={config?.sectionAliases?.[sectionId]?.trim() || 'Brochures'}
		iconName="book-open"
		isMinimized={$isMinimized}
		toggleMinimize={() => ($isMinimized = !$isMinimized)}
	>
		<SleekAccordion title="Available Brochures" isOpen={true}>
			{#if brochureItems.length > 0}
				{#each brochureItems as item}
					<SleekButton active={currentItem?.id === item.id} onClick={() => selectItem(item)}>
						{item.label || item.id}
					</SleekButton>
				{/each}
			{:else}
				<p class="p-2 text-sm text-white/50">Loading brochures...</p>
			{/if}
		</SleekAccordion>
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
	progress::-webkit-progress-value {
		background-color: var(--primary-color);
		border-radius: 4px;
	}
</style>
