<script>
	export let active = false;
	export let onClick = () => {};
</script>

<button
	on:click={onClick}
	class="w-full rounded-xl px-3 py-2 text-left text-sm tracking-wide transition-all duration-300 {active
		? 'border border-white/5 bg-white/10 font-medium text-white shadow-sm'
		: 'text-white/60 hover:bg-white/5 hover:text-white'}"
>
	<slot />
</button>
