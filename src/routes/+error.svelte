<script>
	import '../app.pcss';
	import './styles.css';
	export let data;
	export let status;

	let error = data?.error || null;

	function getErrorMessage() {
		if (error) return error;

		if (status === 404) return 'Page not found';
		if (status === 500) return 'Internal server error';
		if (status === 403) return 'Config Not Found';
		return 'An error occurred';
	}
</script>

<svelte:head>
	<title>Error {status}</title>
</svelte:head>

<div class="error-container">
	<div class="error-content">
		<h1 class="error-title">Error {status}</h1>
		<h2 class="error-subtitle">{getErrorMessage()}</h2>

		<p class="error-message">
			{#if error}
				{error}
			{:else}
				Sorry, something went wrong. Please try again later.
			{/if}
		</p>

		<button on:click={() => location.reload()} class="retry-button"> Retry </button>
	</div>
</div>

<style>
	.error-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		z-index: 999999;
	}

	.error-content {
		text-align: center;
		color: white;
		padding: 2rem;
		max-width: 500px;
	}

	.error-icon {
		margin-bottom: 1.5rem;
		opacity: 0.8;
	}

	.error-title {
		font-size: 4rem;
		font-weight: 700;
		margin: 0;
		line-height: 1;
		background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.error-subtitle {
		font-size: 2rem;
		font-weight: 600;
		margin: 1rem 0;
		color: #e0e0e0;
	}

	.error-message {
		font-size: 1.1rem;
		color: #a0a0a0;
		margin: 1.5rem 0 2rem;
		line-height: 1.6;
	}

	.retry-button {
		display: inline-block;
		padding: 1rem 2.5rem;
		background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
		color: white;
		text-decoration: none;
		border: none;
		border-radius: 50px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
	}

	.retry-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
	}

	@media (max-width: 768px) {
		.error-title {
			font-size: 3rem;
		}

		.error-subtitle {
			font-size: 1.5rem;
		}

		.error-message {
			font-size: 1rem;
		}

		.error-content {
			padding: 1.5rem;
		}
	}
</style>
