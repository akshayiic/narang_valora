<script lang="ts">
	import { fade } from 'svelte/transition';

	export let isVisible = true;
	export let duration = 100;
	export let variant = 'default'; // 'default' or 'transparent'
</script>

{#if isVisible}
	<div class="loading-overlay {variant}" transition:fade={{ duration }}>
		<slot />
	</div>
{/if}

<style>
	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(15, 15, 25);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(50px);
		z-index: 9999;
	}

	.loading-overlay.transparent {
		background: transparent;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
	}
</style>
