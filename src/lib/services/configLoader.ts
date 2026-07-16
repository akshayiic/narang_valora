/**
 * Configuration Loader Service
 * Fetches tenant configuration from S3 based on org, project, and environment
 */

import { dev } from '$app/environment';
import localConfig from '../../config.json';

const S3_BUCKET = dev ? '/webtool' : 'https://assets.vestate.io/webtool';

const ENV_CONFIG_MAP: Record<string, string> = {
	staging: 'config-staging.json',
	test: 'config-test.json',
	production: 'config.json'
};

/**
 * Fetch configuration from local src/config.json
 */
export async function fetchConfig(org, project, env: string = 'production') {
	console.log(`[ConfigLoader] Loading local config for ${org}/${project}`);
	return localConfig;
}

/**
 * Build S3 config URL
 */
export function buildConfigUrl(org, project, env: string = 'production') {
	const configFile = ENV_CONFIG_MAP[env] || ENV_CONFIG_MAP.production;
	return `${S3_BUCKET}/${org}/${project}/${configFile}`;
}
