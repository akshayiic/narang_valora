<script>
	let count = 0;
	let name = 'world';

	function increment() {
		count += 1;
	}

	function decrement() {
		count -= 1;
	}
</script>

<main>
	<h1>Hello {name}!</h1>

	<div class="counter">
		<button on:click={decrement}>-</button>
		<span class="count">{count}</span>
		<button on:click={increment}>+</button>
	</div>

	<p>You've clicked the counter {count} time{count === 1 ? '' : 's'}.</p>

	<div class="input-section">
		<label for="name-input">Change the greeting:</label>
		<input id="name-input" bind:value={name} placeholder="Enter a name" />
	</div>
</main>

<style>
	main {
		text-align: center;
		padding: 2rem;
		max-width: 600px;
		margin: 0 auto;
		font-family: Arial, sans-serif;
	}

	h1 {
		color: #ff3e00;
		font-size: 2.5rem;
		margin-bottom: 2rem;
	}

	.counter {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin: 2rem 0;
	}

	button {
		background: #ff3e00;
		color: white;
		border: none;
		padding: 0.8rem 1.2rem;
		font-size: 1.2rem;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	button:hover {
		background: #d63200;
	}

	.count {
		font-size: 2rem;
		font-weight: bold;
		min-width: 3rem;
	}

	.input-section {
		margin-top: 2rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
	}

	input {
		padding: 0.5rem;
		font-size: 1rem;
		border: 2px solid #ccc;
		border-radius: 4px;
		width: 200px;
	}

	input:focus {
		outline: none;
		border-color: #ff3e00;
	}

	p {
		margin: 1rem 0;
		font-size: 1.1rem;
	}
</style>
