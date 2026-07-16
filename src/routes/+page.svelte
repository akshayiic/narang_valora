<script lang="ts">
	import '../app.pcss';
	import './styles.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import Icon from '$lib/components/Icon.svelte';
	import { slugify } from '$lib/utils';

	let ready = false;
	let isRedirecting = false;

	onMount(async () => {
		ready = true;
		const configStr = localStorage.getItem('projectConfig');
		if (configStr) {
			try {
				const config = JSON.parse(configStr);
				const { orgName, projectName, env } = config;
				if (orgName && projectName) {
					isRedirecting = true;
					const sanitizedOrg = slugify(orgName);
					const sanitizedPrj = slugify(projectName);

					let path = `/${sanitizedOrg}-${sanitizedPrj}`;
					if (env && env !== 'production') {
						path += `-${env}`;
					}
					// Small delay to allow splash animation to start
					setTimeout(async () => {
						await goto(path.toLowerCase(), { replaceState: true });
					}, 1500);
				}
			} catch (e) {
				console.error('Failed to parse config:', e);
				isRedirecting = false;
			}
		}
	});
</script>

<svelte:head>
	<title>V-Estate | Immersive Real Estate Visualization</title>
	<meta
		name="description"
		content="Experience the future of real estate with high-fidelity 3D virtual tours and AI-powered insights."
	/>
</svelte:head>

<main class="relative h-screen w-screen overflow-hidden bg-black font-sans selection:bg-white/20">
	<!-- Background Video -->
	<div class="absolute inset-0 z-0">
		<video
			autoplay
			muted
			loop
			playsinline
			class="h-full w-full object-cover opacity-60 transition-opacity duration-1000"
			class:opacity-30={isRedirecting}
		>
			<source
				src="https://framer-assets.vestate.iiclab.com/home/v-estate-hero-720.mp4"
				type="video/mp4"
			/>
		</video>
		<!-- Dark Vignette Overlay -->
		<div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60"></div>
	</div>

	<!-- Content Layer -->
	{#if ready}
		<div class="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
			<div in:fly={{ y: 30, duration: 1000, delay: 200 }} out:fade>
				<!-- Brand Header -->
				<div class="mb-2 flex items-center justify-center gap-3">
					<span class="text-sm font-light uppercase tracking-[0.3em] text-white/50">Welcome to</span
					>
				</div>

				<!-- Main Logo -->
				<div class="relative mb-8 flex items-center justify-center">
					<Icon name="vestate" size={240} color="white" />
				</div>

				<!-- Tagline -->
				<p class="mx-auto max-w-lg text-lg font-light tracking-wide text-white/80 md:text-xl">
					{#if isRedirecting}
						<span in:fade={{ duration: 500 }}>Initializing your immersive experience...</span>
					{:else}
						<span in:fade={{ duration: 500, delay: 800 }}
							>Redefining the Future of Real Estate Visualization.</span
						>
					{/if}
				</p>
			</div>

			<!-- Bottom Navigation/CTA (Only if not redirecting) -->
			{#if !isRedirecting}
				<div 
					in:fade={{ delay: 1500, duration: 1000 }} 
					class="absolute bottom-12 flex flex-col items-center gap-6"
				>
					<a 
						href="https://vestate.io/"
						target="_blank"
						rel="noopener noreferrer"
						class="group relative flex items-center gap-3 overflow-hidden rounded-full border border-white/20 bg-white/5 px-8 py-3 text-sm font-medium tracking-widest text-white transition-all duration-300 hover:border-white/40 hover:bg-white/10 active:scale-95"
					>
						<span class="relative z-10 uppercase">Explore Platform</span>
						<div class="absolute inset-0 z-0 translate-y-full bg-gradient-to-t from-white/10 to-transparent transition-transform duration-500 group-hover:translate-y-0"></div>
					</a>

					<div class="flex items-center gap-4 text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
						<span>AI Powered</span>
						<span class="h-1 w-1 rounded-full bg-white/20"></span>
						<span>Real-time 3D</span>
						<span class="h-1 w-1 rounded-full bg-white/20"></span>
						<span>Immersive</span>
					</div>
				</div>
			{/if}

			<!-- Loading Indicator for Redirection -->
			{#if isRedirecting}
				<div class="absolute bottom-16 flex flex-col items-center gap-4" in:fade>
					<div class="h-1 w-48 overflow-hidden rounded-full bg-white/10">
						<div
							class="h-full w-full origin-left animate-[loading_1.5s_ease-in-out_infinite] bg-white"
						></div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: black;
	}

	@keyframes loading {
		0% {
			transform: scaleX(0);
			transform-origin: left;
		}
		45% {
			transform: scaleX(1);
			transform-origin: left;
		}
		50% {
			transform: scaleX(1);
			transform-origin: right;
		}
		100% {
			transform: scaleX(0);
			transform-origin: right;
		}
	}
</style>
