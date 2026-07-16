<script lang="ts">
	import { icons } from 'lucide-svelte';

	// Icon name in Lucide kebab-case (e.g. "bookmark-minus"), typically from config.
	export let name: string = '';
	export let size: number = 20;
	export let color: string = 'currentColor';
	// Fallback Lucide icon used when `name` is empty or not a known icon.
	export let fallback: string = 'star';
	let className: string = '';
	export { className as class };

	// Convert kebab/snake/space case to the PascalCase keys used by the icons map.
	function toPascal(n: string): string {
		return (n || '')
			.split(/[-_\s]+/)
			.filter(Boolean)
			.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
			.join('');
	}

	$: comp = icons[toPascal(name)] ?? icons[toPascal(fallback)] ?? null;
</script>

{#if comp}
	<svelte:component this={comp} {size} {color} class={className} />
{/if}
