<script lang="ts">
	import { projectConfig } from '../../stores/ui';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	$: config = $projectConfig;
	$: project = $page.params.project;

	function goToFirstVisibleSection() {
		const sections = ['overview', 'amenities', 'brochure', 'vicinities', 'exterior', 'interiors'];
		const firstVisible = sections.find((s) => config?.sectionVisibility?.[s]);
		if (firstVisible && project) {
			goto(`/${project}/${firstVisible}`);
		}
	}
</script>

{#if !config || Object.keys(config).length === 0}
	<!-- Config not loaded fallback -->
	<div class="fallback-container">
		<div class="fallback-content">
			<div class="loading-spinner"></div>
			<h2>Loading...</h2>
			<p>Please wait while we load the project configuration.</p>
		</div>
	</div>
{:else}
	<!-- Section not available fallback -->
	<div class="fallback-container">
		<div class="fallback-content">
			<div class="fallback-icon-wrapper">
				<svg
					width="80"
					height="80"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					class="fallback-icon"
				>
					<path
						d="M12 2C6.47 2 2 6.47 2 12C2 17.53 6.47 22 12 22C17.53 22 22 17.53 22 12C22 6.47 17.53 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
						fill="var(--primary-color)"
					/>
				</svg>
			</div>
			<h2>Section Not Available</h2>
			<p>This section is currently not available for this project.</p>
			{#if config?.sectionVisibility && Object.values(config.sectionVisibility).some((v) => v)}
				<button class="primary-btn" on:click={goToFirstVisibleSection}>
					Go to Available Section
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.fallback-container {
		width: 100vw;
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		position: fixed;
		top: 0;
		left: 0;
		z-index: 999999;
	}

	.fallback-content {
		text-align: center;
		color: white;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.fallback-icon-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.fallback-icon {
		opacity: 0.9;
	}

	.fallback-content h2 {
		font-size: 1.8rem;
		font-weight: 600;
		margin: 0;
	}

	.fallback-content p {
		color: rgba(255, 255, 255, 0.7);
		font-size: 1rem;
		margin: 0;
	}

	.fallback-content .primary-btn {
		margin-top: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: var(--primary-color);
		color: white;
		border: none;
		border-radius: var(--border-radius);
		font-size: 1rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.fallback-content .primary-btn:hover {
		opacity: 0.9;
	}

	.loading-spinner {
		width: 48px;
		height: 48px;
		margin-bottom: 1rem;
		border: 4px solid rgba(255, 255, 255, 0.1);
		border-top-color: var(--primary-color);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
