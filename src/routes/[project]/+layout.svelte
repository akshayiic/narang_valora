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
	$: project = $page.params.project;
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
	$: sections = Object.keys(config?.sectionVisibility || {}).filter(k => config.sectionVisibility[k]);
</script>

<div
	class="app h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden"
	style:--primary-color={primaryColor}
	style:--primary-color-light={primaryColorLight}
>
	{#if loading}
		<div class="flex h-full w-full items-center justify-center">Loading...</div>
	{:else if error}
		<div class="flex h-full w-full items-center justify-center text-red-500">{error}</div>
	{:else}
		<header class="flex h-16 w-full items-center justify-between bg-black/50 px-6 backdrop-blur-md z-50 absolute top-0">
			<div class="flex items-center gap-4">
				{#if config.orgLogo}
					<img src={config.orgLogo} alt="Org Logo" class="h-8 object-contain" />
				{/if}
				<span class="font-bold">{config.projectName}</span>
			</div>
			
			<nav class="flex gap-4">
				{#each sections as section}
					<a
						href={`/${project}/${section}`}
						class="rounded px-4 py-2 transition-colors hover:bg-white/10 {$page.params.sectionId === section ? 'bg-white/20 font-bold' : ''}"
					>
						{section}
					</a>
				{/each}
			</nav>
			
			{#if config.projectLogo}
				<img src={config.projectLogo} alt="Project Logo" class="h-8 object-contain" />
			{/if}
		</header>
		
		<main class="flex-1 w-full h-full relative">
			<slot />
		</main>
	{/if}
</div>
