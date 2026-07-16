<script>
	export let active = false;
	export let onClick = () => {};
</script>

<button
	on:click={onClick}
	class="w-full text-left py-2 px-3 rounded-xl transition-all duration-300 text-sm tracking-wide {active ? 'bg-white/10 text-white font-medium shadow-sm border border-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'}"
>
	<slot />
</button>
