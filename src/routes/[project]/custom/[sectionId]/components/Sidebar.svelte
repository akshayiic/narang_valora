<script>
	import { Accordion } from 'bits-ui';
	import SleekSidePanel from '$lib/components/ui/sleek/SleekSidePanel.svelte';
	import SleekAccordion from '$lib/components/ui/sleek/SleekAccordion.svelte';
	import SleekButton from '$lib/components/ui/sleek/SleekButton.svelte';
	import LucideIcon from '$lib/components/LucideIcon.svelte';
	import minimizeBtn from '$lib/images/minimize-icon.svg';
	import maximizeBtn from '$lib/images/maximize-icon.svg';
	import 'iconify-icon';

	function getIconifyName(name) {
		if (!name) return 'lucide:layers';
		if (name.includes(':')) return name;
		if (name.toLowerCase() === 'drone') return 'tabler:drone';
		return `lucide:${name}`;
	}

	export let section;
	export let panelMin;
	export let activeType;
	export let activeItem;
	export let currentSceneId;
	export let selectedImageIndex;
	export let catzipScenesMap;

	export let selectSectionItem;
	export let switchToScene;
	export let togglePanel;
	export let isRightSidebar = false;

	function labelFor(img, index) {
		let inner = img;
		if (img && typeof img === 'object' && 'url' in img) {
			inner = img.url;
		}

		if (inner && typeof inner === 'object') {
			if (inner.label) return inner.label;
			if (inner.name) return inner.name;
			const fileUrl = inner.file || inner.url || '';
			const parts = fileUrl.split('/');
			let name = parts.pop() || `Image ${index + 1}`;
			if (name.includes('.')) name = name.substring(0, name.lastIndexOf('.'));
			return name.replace(/[-_]/g, ' ');
		}

		const parts = (inner || '').split('/');
		let name = parts.pop() || `Image ${index + 1}`;
		if (name.includes('.')) name = name.substring(0, name.lastIndexOf('.'));
		return name.replace(/[-_]/g, ' ');
	}
	let isSidebarMinimized = false;
</script>

{#if isRightSidebar}
	<SleekSidePanel
		isRightSidebar={true}
		title={section.name || 'Menu'}
		iconName={section.icon || 'layers'}
		isMinimized={isSidebarMinimized}
		toggleMinimize={() => (isSidebarMinimized = !isSidebarMinimized)}
		useLucideIcon={true}
	>
		<!-- Catzip (BHK) Scenes -->
		{#if Array.isArray(section.catzip) && section.catzip.length > 0}
			{#if section.catzipHeadName === 'Drone Shots' || section.catzipHeadName === 'Aerial View'}
				<SleekAccordion
					title={section.catzipHeadName || 'Drone Shots'}
					iconName={getIconifyName(section.catzipHeadIcon)}
					isIconify={true}
					isOpen={['catzip'].includes(activeType)}
				>
					<div class="flex flex-col gap-1.5 pt-1">
						{#each section.catzip as item}
							<SleekButton
								active={activeType === 'catzip' && activeItem?.id === item.id}
								onClick={() => {
									selectSectionItem('catzip', item);
									if (catzipScenesMap[item.id] && catzipScenesMap[item.id].length > 0) {
										const lastScene = catzipScenesMap[item.id][catzipScenesMap[item.id].length - 1];
										switchToScene(lastScene.id);
									}
								}}
							>
								{item.name || item.id}
							</SleekButton>
						{/each}
					</div>
				</SleekAccordion>
			{:else}
				<SleekAccordion
					title={section.catzipHeadName || 'Amenities'}
					iconName={getIconifyName(section.catzipHeadIcon)}
					isIconify={true}
					isOpen={['catzip'].includes(activeType)}
				>
					{#each section.catzip as item}
						{#if item.name}
							<SleekAccordion
								title={item.name}
								isOpen={activeType === 'catzip' && activeItem?.id === item.id}
							>
								{#if catzipScenesMap[item.id] && catzipScenesMap[item.id].length > 0}
									{#each catzipScenesMap[item.id] as scene}
										<SleekButton
											active={currentSceneId === scene.id && activeItem?.id === item.id}
											onClick={() => {
												selectSectionItem('catzip', item);
												switchToScene(scene.id);
											}}
										>
											{scene.name || scene.id}
										</SleekButton>
									{/each}
								{:else}
									<p class="pl-3 text-xs text-white/50">Loading rooms...</p>
								{/if}
							</SleekAccordion>
						{:else if catzipScenesMap[item.id] && catzipScenesMap[item.id].length > 0}
							{#each catzipScenesMap[item.id] as scene}
								<SleekButton
									active={currentSceneId === scene.id && activeItem?.id === item.id}
									onClick={() => {
										selectSectionItem('catzip', item);
										switchToScene(scene.id);
									}}
								>
									{scene.name || scene.id}
								</SleekButton>
							{/each}
						{:else}
							<p class="pl-3 text-xs text-white/50">Loading rooms...</p>
						{/if}
					{/each}
				</SleekAccordion>
			{/if}
		{/if}

		<!-- Cat24 Panels -->
		{#if Array.isArray(section.cat24) && section.cat24.length > 0}
			<SleekAccordion
				title={section.cat24HeadName || '360 Views'}
				iconName={getIconifyName(section.cat24HeadIcon)}
				isIconify={true}
				isOpen={['cat24'].includes(activeType)}
			>
				{#each section.cat24 as item}
					<SleekButton
						isOpen={activeType === 'cat24' && activeItem?.id === item.id}
						onClick={() => selectSectionItem('cat24', item)}
					>
						{item.name}
					</SleekButton>
				{/each}
			</SleekAccordion>
		{/if}

		<!-- Catstat Panels -->
		{#if Array.isArray(section.catstat) && section.catstat.length > 0}
			<SleekAccordion
				title={section.catstatHeadName || 'Stats'}
				iconName={getIconifyName(section.catstatHeadIcon)}
				isIconify={true}
				isOpen={['catstat'].includes(activeType)}
			>
				{#each section.catstat as item}
					{#if item.name}
						<SleekAccordion
							title={item.name}
							isOpen={activeType === 'catstat' && activeItem?.id === item.id}
						>
							{#if Array.isArray(item.images)}
								{#each item.images as imgUrl, index}
									<SleekButton
										active={selectedImageIndex === index && activeItem?.id === item.id}
										onClick={() => {
											selectSectionItem('catstat', item);
											selectedImageIndex = index;
										}}
									>
										{labelFor({ url: imgUrl }, index)}
									</SleekButton>
								{/each}
							{/if}
						</SleekAccordion>
					{:else if Array.isArray(item.images)}
						{#each item.images as imgUrl, index}
							<SleekButton
								active={selectedImageIndex === index && activeItem?.id === item.id}
								onClick={() => {
									selectSectionItem('catstat', item);
									selectedImageIndex = index;
								}}
							>
								{labelFor({ url: imgUrl }, index)}
							</SleekButton>
						{/each}
					{/if}
				{/each}
			</SleekAccordion>
		{/if}

		<!-- Categories (General) -->
		{#if Array.isArray(section.categories) && section.categories.length > 0}
			<SleekAccordion
				title={section.categoriesHeadName || 'Categories'}
				iconName={getIconifyName(section.categoriesHeadIcon)}
				isIconify={true}
				isOpen={['categories'].includes(activeType)}
			>
				{#each section.categories as item}
					{#if item.name}
						<SleekAccordion
							title={item.name}
							isOpen={activeType === 'categories' && activeItem?.id === item.id}
						>
							{#if item.zipUrl}
								{#if catzipScenesMap[item.id] && catzipScenesMap[item.id].length > 0}
									{#each catzipScenesMap[item.id] as scene}
										<SleekButton
											active={currentSceneId === scene.id && activeItem?.id === item.id}
											onClick={() => {
												selectSectionItem('categories', item);
												switchToScene(scene.id);
											}}
										>
											{scene.name || scene.id}
										</SleekButton>
									{/each}
								{:else}
									<p class="pl-3 text-xs text-white/50">Loading rooms...</p>
								{/if}
							{:else if Array.isArray(item.images) && item.images.length > 0}
								{#each item.images as imgUrl, index}
									<SleekButton
										active={selectedImageIndex === index && activeItem?.id === item.id}
										onClick={() => {
											selectSectionItem('categories', item);
											selectedImageIndex = index;
										}}
									>
										{labelFor({ url: imgUrl }, index)}
									</SleekButton>
								{/each}
							{:else}
								<p class="pl-3 text-xs text-white/50">No content available</p>
							{/if}
						</SleekAccordion>
					{:else if item.zipUrl}
						{#if catzipScenesMap[item.id] && catzipScenesMap[item.id].length > 0}
							{#each catzipScenesMap[item.id] as scene}
								<SleekButton
									active={currentSceneId === scene.id && activeItem?.id === item.id}
									onClick={() => {
										selectSectionItem('categories', item);
										switchToScene(scene.id);
									}}
								>
									{scene.name || scene.id}
								</SleekButton>
							{/each}
						{:else}
							<p class="pl-3 text-xs text-white/50">Loading rooms...</p>
						{/if}
					{:else if Array.isArray(item.images) && item.images.length > 0}
						{#each item.images as imgUrl, index}
							<SleekButton
								active={selectedImageIndex === index && activeItem?.id === item.id}
								onClick={() => {
									selectSectionItem('categories', item);
									selectedImageIndex = index;
								}}
							>
								{labelFor({ url: imgUrl }, index)}
							</SleekButton>
						{/each}
					{/if}
				{/each}
			</SleekAccordion>
		{/if}
	</SleekSidePanel>
{:else}
	<div
		class={isRightSidebar
			? 'fixed right-0 top-0 z-[99999999999999] flex h-full w-[350px] max-w-full flex-col overflow-y-auto bg-white px-4 pb-20 pt-6 shadow-2xl transition-transform duration-300'
			: 'absolute bottom-[4rem] left-[2rem] z-[99999999999999] flex flex-col gap-4'}
	>
		<!-- Day & Night Toggle Button logic is left in the main page for now or can be added here if needed -->
		<slot />

		<div class={isRightSidebar ? 'w-full' : 'left-panel-wrapper !static'}>
			<div class={isRightSidebar ? 'w-full' : 'left-panel p-2 shadow-2xl'}>
				<!-- Header for the merged accordion box -->
				<div
					class={isRightSidebar
						? 'mb-4 flex items-center justify-between border-b border-gray-100 pb-4'
						: 'left-panel--header mb-2 flex justify-between gap-[1rem] lg:gap-[3rem]'}
				>
					<div class="left-title flex items-center font-bold">
						<LucideIcon
							name={section.icon || 'layers'}
							size={20}
							class="mr-2"
							color="var(--primary-color)"
						/>
						<span class="text-lg" style="color: var(--primary-color)">
							{section.name || 'Menu'}
						</span>
					</div>
					{#if !isRightSidebar}
						<button on:click={() => togglePanel('catzip')} class="ghost-btn close-btn !px-0 !py-0">
							{#if !panelMin.catzip}
								<img src={minimizeBtn} alt="minimize" />
							{:else}
								<img src={maximizeBtn} alt="maximize" />
							{/if}
						</button>
					{/if}
				</div>

				<div class={isRightSidebar || !panelMin.catzip ? 'block' : 'hidden'}>
					<div class="no-hovers pt-1">
						<div class="inner-btn-group left-panel-scroll">
							<Accordion.Root
								class="w-full sm:max-w-full"
								value={['catzip', 'cat24', 'catstat', 'categories'].includes(activeType)
									? activeType
									: undefined}
							>
								<!-- Catzip (BHK) Scenes -->
								{#if Array.isArray(section.catzip) && section.catzip.length > 0}
									{#if section.catzipHeadName === 'Drone Shots' || section.catzipHeadName === 'Aerial View'}
										<Accordion.Item value="catzip" class="border-b border-gray-100 last:border-0">
											<Accordion.Trigger
												class="flex w-full items-center justify-between rounded px-1 py-3 hover:bg-gray-50 [&[data-state=open]_.chevron]:rotate-180"
											>
												<div class="left-title flex items-center font-bold">
													<iconify-icon
														icon={getIconifyName(section.catzipHeadIcon)}
														width="20"
														height="20"
														class="mr-2"
														style="color: var(--primary-color)"
													></iconify-icon>
													<span class="text-base">{section.catzipHeadName || 'Amenities'}</span>
												</div>
												<LucideIcon
													name="chevron-down"
													size={16}
													class="chevron transition-transform duration-200"
												/>
											</Accordion.Trigger>
											<Accordion.Content class="bg-white pb-2 pt-2">
												<div class="flex flex-col gap-1">
													{#each section.catzip as item}
														<button
															on:click={() => {
																selectSectionItem('catzip', item);
																if (
																	catzipScenesMap[item.id] &&
																	catzipScenesMap[item.id].length > 0
																) {
																	const lastScene =
																		catzipScenesMap[item.id][catzipScenesMap[item.id].length - 1];
																	switchToScene(lastScene.id);
																}
															}}
															class="inner-modal-btn !w-full {activeType === 'catzip' &&
															activeItem?.id === item.id
																? 'active'
																: ''}"
														>
															<span class="text-left text-sm">{item.name || item.id}</span>
														</button>
													{/each}
												</div>
											</Accordion.Content>
										</Accordion.Item>
									{:else}
										<Accordion.Item value="catzip" class="border-b border-gray-100 last:border-0">
											<Accordion.Trigger
												class="flex w-full items-center justify-between rounded px-1 py-3 hover:bg-gray-50 [&[data-state=open]_.chevron]:rotate-180"
											>
												<div class="left-title flex items-center font-bold">
													<iconify-icon
														icon={getIconifyName(section.catzipHeadIcon)}
														width="20"
														height="20"
														class="mr-2"
														style="color: var(--primary-color)"
													></iconify-icon>
													<span class="text-base">{section.catzipHeadName || 'Amenities'}</span>
												</div>
												<LucideIcon
													name="chevron-down"
													size={16}
													class="chevron transition-transform duration-200"
												/>
											</Accordion.Trigger>
											<Accordion.Content class="bg-white pb-2 pt-2">
												<Accordion.Root
													class="w-full sm:max-w-full"
													value={activeType === 'catzip' ? activeItem?.id : undefined}
												>
													{#each section.catzip as item}
														{#if item.name}
															<Accordion.Item value={item.id} class="border-none">
																<Accordion.Trigger
																	class="inner-modal-btn flex w-full items-center justify-between !py-2 font-bold [&[data-state=open]_.chevron]:rotate-180"
																>
																	<span class="text-left text-sm">{item.name}</span>
																	<LucideIcon
																		name="chevron-down"
																		size={14}
																		class="chevron transition-transform duration-200"
																	/>
																</Accordion.Trigger>
																<Accordion.Content class="bg-white">
																	<div class="ml-2 flex flex-col border-l-2 border-gray-100">
																		{#if catzipScenesMap[item.id] && catzipScenesMap[item.id].length > 0}
																			{#each catzipScenesMap[item.id] as scene}
																				<button
																					on:click={() => {
																						selectSectionItem('catzip', item);
																						switchToScene(scene.id);
																					}}
																					class={currentSceneId === scene.id &&
																					activeItem?.id === item.id
																						? 'active inner-modal-btn !pl-4'
																						: 'inner-modal-btn !pl-4'}
																				>
																					<span class="truncate text-sm"
																						>{scene.name || scene.id}</span
																					>
																				</button>
																			{/each}
																		{:else}
																			<span class="p-2 text-sm text-gray-500">Loading rooms...</span
																			>
																		{/if}
																	</div>
																</Accordion.Content>
															</Accordion.Item>
														{:else}
															<div class="mb-2 flex flex-col">
																{#if catzipScenesMap[item.id] && catzipScenesMap[item.id].length > 0}
																	{#each catzipScenesMap[item.id] as scene}
																		<button
																			on:click={() => {
																				selectSectionItem('catzip', item);
																				switchToScene(scene.id);
																			}}
																			class={currentSceneId === scene.id &&
																			activeItem?.id === item.id
																				? 'active inner-modal-btn'
																				: 'inner-modal-btn'}
																		>
																			<span class="truncate text-sm capitalize"
																				>{scene.name || scene.id}</span
																			>
																		</button>
																	{/each}
																{:else}
																	<span class="p-2 text-sm text-gray-500">Loading rooms...</span>
																{/if}
															</div>
														{/if}
													{/each}
												</Accordion.Root>
											</Accordion.Content>
										</Accordion.Item>
									{/if}
								{/if}

								<!-- Cat24 Panels -->
								{#if Array.isArray(section.cat24) && section.cat24.length > 0}
									<Accordion.Item value="cat24" class="border-b border-gray-100 last:border-0">
										<Accordion.Trigger
											class="flex w-full items-center justify-between rounded px-1 py-3 hover:bg-gray-50 [&[data-state=open]_.chevron]:rotate-180"
										>
											<div class="left-title flex items-center font-bold">
												<iconify-icon
													icon={getIconifyName(section.cat24HeadIcon)}
													width="20"
													height="20"
													class="mr-2"
													style="color: var(--primary-color)"
												></iconify-icon>
												<span class="text-base">{section.cat24HeadName || '360 Views'}</span>
											</div>
											<LucideIcon
												name="chevron-down"
												size={16}
												class="chevron transition-transform duration-200"
											/>
										</Accordion.Trigger>
										<Accordion.Content class="bg-white pb-2 pt-2">
											<div class="flex flex-col gap-2">
												{#each section.cat24 as item}
													<button
														on:click={() => selectSectionItem('cat24', item)}
														class={activeType === 'cat24' && activeItem?.id === item.id
															? 'active inner-modal-btn'
															: 'inner-modal-btn'}
													>
														<span class="text-left text-sm capitalize">{item.name}</span>
													</button>
												{/each}
											</div>
										</Accordion.Content>
									</Accordion.Item>
								{/if}

								<!-- Catstat Panels -->
								{#if Array.isArray(section.catstat) && section.catstat.length > 0}
									<Accordion.Item value="catstat" class="border-b border-gray-100 last:border-0">
										<Accordion.Trigger
											class="flex w-full items-center justify-between rounded px-1 py-3 hover:bg-gray-50 [&[data-state=open]_.chevron]:rotate-180"
										>
											<div class="left-title flex items-center font-bold">
												<iconify-icon
													icon={getIconifyName(section.catstatHeadIcon)}
													width="20"
													height="20"
													class="mr-2"
													style="color: var(--primary-color)"
												></iconify-icon>
												<span class="text-base">{section.catstatHeadName || 'Stats'}</span>
											</div>
											<LucideIcon
												name="chevron-down"
												size={16}
												class="chevron transition-transform duration-200"
											/>
										</Accordion.Trigger>
										<Accordion.Content class="bg-white pb-2 pt-2">
											<Accordion.Root
												class="w-full sm:max-w-full"
												value={activeType === 'catstat' ? activeItem?.id : undefined}
											>
												{#each section.catstat as item}
													{#if item.name}
														<Accordion.Item value={item.id} class="border-none">
															<Accordion.Trigger
																class="inner-modal-btn flex w-full items-center justify-between !py-2 font-bold [&[data-state=open]_.chevron]:rotate-180"
															>
																<span class="text-left text-sm capitalize">{item.name}</span>
																<LucideIcon
																	name="chevron-down"
																	size={14}
																	class="chevron transition-transform duration-200"
																/>
															</Accordion.Trigger>
															<Accordion.Content class="bg-white">
																<div class="ml-2 flex flex-col border-l-2 border-gray-100">
																	{#if Array.isArray(item.images)}
																		{#each item.images as imgUrl, index}
																			<button
																				on:click={() => {
																					selectSectionItem('catstat', item);
																					selectedImageIndex = index;
																				}}
																				class={selectedImageIndex === index &&
																				activeItem?.id === item.id
																					? 'active inner-modal-btn !pl-4'
																					: 'inner-modal-btn !pl-4'}
																			>
																				<span class="truncate text-left text-sm capitalize"
																					>{labelFor({ url: imgUrl }, index)}</span
																				>
																			</button>
																		{/each}
																	{/if}
																</div>
															</Accordion.Content>
														</Accordion.Item>
													{:else}
														<div class="mb-2 flex flex-col">
															{#if Array.isArray(item.images)}
																{#each item.images as imgUrl, index}
																	<button
																		on:click={() => {
																			selectSectionItem('catstat', item);
																			selectedImageIndex = index;
																		}}
																		class={selectedImageIndex === index &&
																		activeItem?.id === item.id
																			? 'active inner-modal-btn'
																			: 'inner-modal-btn'}
																	>
																		<span class="truncate text-left text-sm capitalize"
																			>{labelFor({ url: imgUrl }, index)}</span
																		>
																	</button>
																{/each}
															{/if}
														</div>
													{/if}
												{/each}
											</Accordion.Root>
										</Accordion.Content>
									</Accordion.Item>
								{/if}

								<!-- Categories (General) -->
								{#if Array.isArray(section.categories) && section.categories.length > 0}
									<Accordion.Item value="categories" class="border-b border-gray-100 last:border-0">
										<Accordion.Trigger
											class="flex w-full items-center justify-between rounded px-1 py-3 hover:bg-gray-50 [&[data-state=open]_.chevron]:rotate-180"
										>
											<div class="left-title flex items-center font-bold">
												<iconify-icon
													icon={getIconifyName(section.categoriesHeadIcon)}
													width="20"
													height="20"
													class="mr-2"
													style="color: var(--primary-color)"
												></iconify-icon>
												<span class="text-base">{section.categoriesHeadName || 'Categories'}</span>
											</div>
											<LucideIcon
												name="chevron-down"
												size={16}
												class="chevron transition-transform duration-200"
											/>
										</Accordion.Trigger>
										<Accordion.Content class="bg-white pb-2 pt-2">
											<Accordion.Root
												class="w-full sm:max-w-full"
												value={activeType === 'categories' ? activeItem?.id : undefined}
											>
												{#each section.categories as item}
													{#if item.name}
														<Accordion.Item value={item.id} class="border-none">
															<Accordion.Trigger
																class="inner-modal-btn flex w-full items-center justify-between !py-2 font-bold [&[data-state=open]_.chevron]:rotate-180"
															>
																<span class="text-left text-sm capitalize">{item.name}</span>
																<LucideIcon
																	name="chevron-down"
																	size={14}
																	class="chevron transition-transform duration-200"
																/>
															</Accordion.Trigger>
															<Accordion.Content class="bg-white">
																<div class="ml-2 flex flex-col border-l-2 border-gray-100">
																	{#if item.zipUrl}
																		{#if catzipScenesMap[item.id] && catzipScenesMap[item.id].length > 0}
																			{#each catzipScenesMap[item.id] as scene}
																				<button
																					on:click={() => {
																						selectSectionItem('categories', item);
																						switchToScene(scene.id);
																					}}
																					class={currentSceneId === scene.id &&
																					activeItem?.id === item.id
																						? 'active inner-modal-btn !pl-4'
																						: 'inner-modal-btn !pl-4'}
																				>
																					<span class="truncate text-sm capitalize"
																						>{scene.name || scene.id}</span
																					>
																				</button>
																			{/each}
																		{:else}
																			<span class="p-2 text-sm text-gray-500">Loading rooms...</span
																			>
																		{/if}
																	{:else if Array.isArray(item.images) && item.images.length > 0}
																		{#each item.images as imgUrl, index}
																			<button
																				on:click={() => {
																					selectSectionItem('categories', item);
																					selectedImageIndex = index;
																				}}
																				class={selectedImageIndex === index &&
																				activeItem?.id === item.id
																					? 'active inner-modal-btn !pl-4'
																					: 'inner-modal-btn !pl-4'}
																			>
																				<span class="truncate text-left text-sm capitalize"
																					>{labelFor({ url: imgUrl }, index)}</span
																				>
																			</button>
																		{/each}
																	{:else}
																		<span class="p-2 text-sm text-gray-500"
																			>No content available</span
																		>
																	{/if}
																</div>
															</Accordion.Content>
														</Accordion.Item>
													{:else}
														<div class="mb-2 flex flex-col">
															{#if item.zipUrl}
																{#if catzipScenesMap[item.id] && catzipScenesMap[item.id].length > 0}
																	{#each catzipScenesMap[item.id] as scene}
																		<button
																			on:click={() => {
																				selectSectionItem('categories', item);
																				switchToScene(scene.id);
																			}}
																			class={currentSceneId === scene.id &&
																			activeItem?.id === item.id
																				? 'active inner-modal-btn'
																				: 'inner-modal-btn'}
																		>
																			<span class="truncate text-sm capitalize"
																				>{scene.name || scene.id}</span
																			>
																		</button>
																	{/each}
																{:else}
																	<span class="p-2 text-sm text-gray-500">Loading rooms...</span>
																{/if}
															{:else if Array.isArray(item.images) && item.images.length > 0}
																{#each item.images as imgUrl, index}
																	<button
																		on:click={() => {
																			selectSectionItem('categories', item);
																			selectedImageIndex = index;
																		}}
																		class={selectedImageIndex === index &&
																		activeItem?.id === item.id
																			? 'active inner-modal-btn'
																			: 'inner-modal-btn'}
																	>
																		<span class="truncate text-left text-sm capitalize"
																			>{labelFor({ url: imgUrl }, index)}</span
																		>
																	</button>
																{/each}
															{:else}
																<span class="p-2 text-sm text-gray-500">No content available</span>
															{/if}
														</div>
													{/if}
												{/each}
											</Accordion.Root>
										</Accordion.Content>
									</Accordion.Item>
								{/if}
							</Accordion.Root>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
