<script>
	import { Accordion } from 'bits-ui';
	import LucideIcon from '$lib/components/LucideIcon.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { slide, fade } from 'svelte/transition';
	
	export let navItems = [];
	export let activeSection;
	export let navigateTo;
	export let navigateToCustom;
	export let toggleNav;
	export let isOpen;
</script>

{#if isOpen}
	<div 
		class="fixed inset-0 z-[9998] bg-black/50" 
		transition:fade={{ duration: 200 }}
		on:click={toggleNav}
		on:keydown={(e) => e.key === 'Escape' && toggleNav()}
		role="button"
		tabindex="0"
	></div>
	<div 
		class="fixed top-0 right-0 z-[9999] h-full w-[350px] max-w-full bg-white shadow-2xl overflow-y-auto"
		transition:slide={{ axis: 'x', duration: 300, start: 1 }}
	>
		<div class="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
			<h2 class="text-xl font-bold" style="color: var(--primary-color)">Menu</h2>
			<button on:click={toggleNav} class="p-2 hover:bg-gray-100 rounded-full transition-colors">
				<LucideIcon name="x" size={24} />
			</button>
		</div>

		<div class="p-4 flex flex-col gap-2">
			<Accordion.Root class="w-full">
				{#each navItems as item}
					{#if item.isCustom && (item.catzip?.length || item.cat24?.length || item.catstat?.length || item.categories?.length)}
						<Accordion.Item value={item.id} class="border-b border-gray-100 last:border-0">
							<Accordion.Trigger class="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors [&[data-state=open]_.chevron]:rotate-180 {activeSection === item.id ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color)]' : 'text-gray-700'}">
								<div class="flex items-center gap-4">
									<LucideIcon name={item.icon || 'layers'} size={20} color="currentColor" />
									<span class="font-medium">{item.label}</span>
								</div>
								<LucideIcon name="chevron-down" size={16} class="chevron transition-transform duration-200" />
							</Accordion.Trigger>
							<Accordion.Content class="pt-1 pb-2 px-2">
								<div class="flex flex-col gap-1 pl-10 border-l-2 border-gray-100 ml-6 mt-2">
									<button
										class="text-left py-2 px-3 rounded hover:bg-gray-50 text-sm font-medium transition-colors"
										on:click={() => {
											navigateToCustom(item.id);
											toggleNav();
										}}
									>
										Go to {item.label} Overview
									</button>
								</div>
							</Accordion.Content>
						</Accordion.Item>
					{:else}
						<button
							class="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors {activeSection === item.id ? 'bg-[var(--primary-color)] text-white' : 'hover:bg-gray-50 text-gray-700'}"
							on:click={() => {
								if (item.isCustom) {
									navigateToCustom(item.id);
								} else {
									navigateTo(item.id);
								}
								toggleNav();
							}}
						>
							{#if item.isCustom}
								<LucideIcon name={item.icon || 'layers'} size={20} color="currentColor" />
							{:else}
								<Icon name={item.icon} size={20} color="currentColor" />
							{/if}
							<span class="font-medium">{item.label}</span>
						</button>
					{/if}
				{/each}
			</Accordion.Root>
		</div>
	</div>
{/if}
