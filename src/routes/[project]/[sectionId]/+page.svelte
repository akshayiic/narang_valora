<script lang="ts">
	import { page } from '$app/stores';
	import { projectConfig } from '../../../stores/ui';
	import MarzipanoViewer from '$lib/components/sections/MarzipanoViewer.svelte';
	import Cloud360Viewer from '$lib/components/sections/Cloud360Viewer.svelte';
	import BrochureViewer from '$lib/components/sections/BrochureViewer.svelte';

	$: sectionId = $page.params.sectionId;
	$: config = $projectConfig;
</script>

{#if config}
	{#if ['amenities', 'interiors', 'vicinities'].includes(sectionId)}
		<MarzipanoViewer {config} {sectionId} />
	{:else if ['overview', 'exterior'].includes(sectionId)}
		<Cloud360Viewer
			{config}
			{sectionId}
			imagesConfig={config[sectionId === 'overview' ? 'overviewImages' : 'exterior']}
		/>
	{:else if sectionId === 'brochure'}
		<BrochureViewer {config} {sectionId} brochureConfig={config.brochureSection?.items || []} />
	{:else}
		<div class="flex h-full w-full items-center justify-center text-white">
			<h2>Section '{sectionId}' is not fully configured or supported.</h2>
		</div>
	{/if}
{:else}
	<div class="flex h-full w-full items-center justify-center text-white">
		<p>Loading project sections...</p>
	</div>
{/if}
