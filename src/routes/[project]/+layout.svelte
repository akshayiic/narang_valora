<script lang="ts">
	import '../../app.pcss';
	import '../styles.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { projectConfig, collabEnv } from '../../stores/ui';
	import { fetchConfig } from '$lib/services/configLoader';

	export let data;

	let config = null;
	let error = null;
	let loading = true;
	$: env = data?.env || 'production';
	$: org = data?.org;
	$: prj = data?.prj;

	onMount(async () => {
		try {
			console.log(`[ProjectLayout] Fetching config for ${org}/${prj} (${env})...`);
			config = await fetchConfig(org, prj, env);
			
			if (config.theme?.fontUrl && config.theme?.fontName) {
				const style = document.createElement('style');
				style.textContent = `
					@font-face {
						font-family: '${config.theme.fontName}';
						src: url('${config.theme.fontUrl}') format('opentype');
						font-weight: normal;
						font-style: normal;
						font-display: swap;
					}

					:root {
						--font-body: '${config.theme.fontName}', sans-serif !important;
					}

					* {
						font-family: '${config.theme.fontName}', sans-serif !important;
					}
				`;
				document.head.appendChild(style);
			}

			projectConfig.set({ ...config, env });
			collabEnv.set(env);
		} catch (e) {
			console.error(e);
			error = e.message;
		} finally {
			loading = false;
		}
	});

	$: theme = config?.theme || {};
	$: primaryColor = theme.primaryColor || '#4434dd';
	$: primaryColorLight = theme.secondaryColor || '#8076ee';
</script>

<div
	class="app h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden relative"
	style:--primary-color={primaryColor}
	style:--primary-color-light={primaryColorLight}
>
	{#if loading}
		<div class="flex h-full w-full items-center justify-center">Loading...</div>
	{:else if error}
		<div class="flex h-full w-full items-center justify-center text-red-500">{error}</div>
	{:else}
		<main class="flex-1 w-full h-full relative">
			<slot />
		</main>
	{/if}
</div>
