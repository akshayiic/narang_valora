<script>
	import maximizeBtn from '$lib/images/maximize-icon.svg';
	import minimizeBtn from '$lib/images/minimize-icon.svg';
	import { createLoadObserver } from '$lib/utils.ts';
	import { getContext } from 'svelte';
	import { writable } from 'svelte/store';
	let currentUI = getContext('currentUI');
	let navSlide = getContext('navSlide');

	navSlide.set(true);
	$currentUI['access'] = true;
	const onload = createLoadObserver(() => {
		console.log('loaded!!!');
	});
	const isInteriorUnitDataMinimized = writable();
	$: isInteriorUnitDataMinimized.set(true);
	const accessRoad = writable();
	$: accessRoad.set('video');
</script>

{#if $accessRoad == 'video'}
	<video
		src="https://framer-assets.vestate.iiclab.com/evara/access-roads/evara-comp.mp4 "
		autoplay
		class="video absolute top-0 h-full w-full bg-black"
		muted
		loop
	></video>
{:else}
	<img
		src={'https://framer-assets.vestate.iiclab.com/evara/' + $accessRoad}
		use:onload
		alt="Vicinity"
		class="absolute top-0 h-full w-full"
	/>
{/if}
