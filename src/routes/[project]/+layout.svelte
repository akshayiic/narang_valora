<script lang="ts">
	import '../../app.pcss';
	import '../styles.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { projectConfig, collabEnv, UIPanel } from '../../stores/ui';
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
	class="app relative flex h-screen w-screen flex-col overflow-hidden bg-gray-900 text-white"
	style:--primary-color={primaryColor}
	style:--primary-color-light={primaryColorLight}
>
	{#if loading}
		<div class="flex h-full w-full items-center justify-center">Loading...</div>
	{:else if error}
		<div class="flex h-full w-full items-center justify-center text-red-500">{error}</div>
	{:else}
		{#if $page.route.id === '/[project]' && $UIPanel === 'intro'}
			{#if $projectConfig?.projectLogo}
				<a
					href="/{$page.params.project}"
					class="fixed left-6 top-6 z-[99999999] max-w-[120px] transition-transform duration-300 hover:scale-[1.02] sm:max-w-[150px] md:max-w-[180px]"
				>
					<img
						src={$projectConfig.projectLogo}
						alt="Project Logo"
						class="h-auto max-h-[40px] w-full object-contain sm:max-h-[50px] md:max-h-[60px]"
					/>
				</a>
			{/if}
			{#if $projectConfig?.orgLogo}
				<div
					class="fixed right-6 top-6 z-[99999999] max-w-[120px] sm:max-w-[150px] md:max-w-[180px]"
				>
					<img
						src={$projectConfig.orgLogo}
						alt="Organization Logo"
						class="h-auto max-h-[40px] w-full object-contain sm:max-h-[50px] md:max-h-[60px]"
					/>
				</div>
			{/if}
		{/if}
		<main class="relative h-full w-full flex-1">
			<slot />
		</main>
	{/if}
</div>
