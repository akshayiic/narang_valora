import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export const UIPanel = writable('intro');

// Persist activeSection to localStorage
const getInitialActiveSection = () => {
	if (!browser) return 'overview';
	const saved = localStorage.getItem('activeSection');
	return saved || 'overview';
};

export const activeSection = writable(getInitialActiveSection());

// Subscribe to save changes to localStorage
if (browser) {
	activeSection.subscribe((value) => {
		localStorage.setItem('activeSection', value);
	});
}

export const hotspotName = writable('Exterior');
export const walkthroughDisabled = writable(false);
export const navSlide = writable(false);
export const vicinityImg = writable('-');

export const collabEnv = writable('test');

// Project Config Store with localStorage persistence
const getInitialProjectConfig = (): any | null => {
	if (!browser) return null;

	try {
		const saved = localStorage.getItem('projectConfig');
		if (saved) {
			return JSON.parse(saved);
		}
	} catch (error) {
		console.error('[ConfigStore] Error loading config from localStorage:', error);
	}

	return null;
};

export const projectConfig = writable<any | null>(getInitialProjectConfig());

// Subscribe to save changes to localStorage
if (browser) {
	projectConfig.subscribe((value) => {
		if (value) {
			localStorage.setItem('projectConfig', JSON.stringify(value));
		} else {
			localStorage.removeItem('projectConfig');
		}
	});
}

/**
 * Clear the project configuration from store and localStorage
 */
export function clearProjectConfig() {
	projectConfig.set(null);
	if (browser) {
		localStorage.removeItem('projectConfig');
	}
}

export const navItemsStore = derived(projectConfig, ($config) => {
	if (!$config) return [];

	const customNavSections = Array.isArray($config?.customSections)
		? $config.customSections.filter(
				(s) =>
					s?.enabled !== false &&
					(s?.mode === 'dayNightPlus' ||
						(Array.isArray(s?.images) && s.images.length > 0) ||
						!!s?.image ||
						(s?.dayNight &&
							(Array.isArray(s.dayNight.day) ||
								Array.isArray(s.dayNight.evening) ||
								Array.isArray(s.dayNight.night))) ||
						(Array.isArray(s?.catzip) && s.catzip.length > 0) ||
						(Array.isArray(s?.cat24) && s.cat24.length > 0) ||
						(Array.isArray(s?.catstat) && s.catstat.length > 0) ||
						(Array.isArray(s?.categories) && s.categories.length > 0))
			)
		: [];

	const getLabel = (conf, key, defaultLabel) => {
		if (
			conf?.sectionAliases &&
			typeof conf.sectionAliases[key] === 'string' &&
			conf.sectionAliases[key].trim() !== ''
		) {
			return conf.sectionAliases[key].trim();
		}
		return defaultLabel;
	};

	const sections = [
		{ key: 'overview', label: getLabel($config, 'overview', 'Overview'), icon: 'overview' },
		{ key: 'amenities', label: getLabel($config, 'amenities', 'Amenities'), icon: 'amenities' },
		{ key: 'interiors', label: getLabel($config, 'interiors', 'Interiors'), icon: 'interiors' },
		{ key: 'exterior', label: getLabel($config, 'exterior', 'Exterior'), icon: 'exterior' },
		{ key: 'vicinities', label: getLabel($config, 'vicinities', 'Vicinity'), icon: 'vicinities' },
		{ key: 'brochure', label: getLabel($config, 'brochure', 'Brochure'), icon: 'brochure' }
	];

	const visibleSections = $config?.sectionVisibility
		? sections.filter((s) => $config.sectionVisibility[s.key])
		: [];

	const defaultSecs = visibleSections.map((s) => ({ ...s, isCustom: false, id: s.key }));
	const customSecs = customNavSections.map((s) => ({
		...s,
		isCustom: true,
		label: s.name,
		key: `custom:${s.id}`
	}));

	let allItems = [...defaultSecs, ...customSecs];

	if (Array.isArray($config?.sectionOrder) && $config.sectionOrder.length > 0) {
		const orderMap = new Map();
		$config.sectionOrder.forEach((id, index) => {
			orderMap.set(id, index);
		});

		allItems.sort((a, b) => {
			const idA = a.isCustom ? `custom:${a.id}` : a.id;
			const idB = b.isCustom ? `custom:${b.id}` : b.id;

			const orderA = orderMap.has(idA) ? orderMap.get(idA) : 999999;
			const orderB = orderMap.has(idB) ? orderMap.get(idB) : 999999;

			return orderA - orderB;
		});
	}

	return allItems;
});
