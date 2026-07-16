<script>
	import { slide } from 'svelte/transition';
	import LucideIcon from '$lib/components/LucideIcon.svelte';
	
	export let title = '';
	export let isOpen = false;
	export let iconName = null;
	export let isIconify = false;
</script>

<div class="mb-3 rounded-2xl bg-white/5 border border-white/5 overflow-hidden transition-colors hover:bg-white/10 hover:border-white/10">
	<button 
		class="w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none"
		on:click={() => { isOpen = !isOpen; }}
	>
		<div class="flex items-center gap-3">
			{#if iconName}
				<div class="text-white/60">
					{#if isIconify}
						<iconify-icon icon={iconName} width="18" height="18"></iconify-icon>
					{:else}
						<LucideIcon name={iconName} size={18} />
					{/if}
				</div>
			{/if}
			<span class="text-sm font-medium text-white/90 tracking-wide">{title}</span>
		</div>
		<div class="text-white/40 transform transition-transform duration-300 {isOpen ? 'rotate-180' : ''}">
			<LucideIcon name="chevron-down" size={16} />
		</div>
	</button>

	{#if isOpen}
		<div transition:slide={{ duration: 300, axis: 'y' }} class="px-5 pb-4 text-white/70">
			<div class="flex flex-col gap-1 border-l border-white/10 ml-2 pl-4">
				<slot />
			</div>
		</div>
	{/if}
</div>
