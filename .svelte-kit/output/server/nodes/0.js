import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.CbSdJpO-.js","_app/immutable/chunks/disclose-version.MBpbH8Sa.js","_app/immutable/chunks/runtime.BDO5jb-F.js","_app/immutable/chunks/if.D-bS588Z.js","_app/immutable/chunks/class.CtGEUSPq.js","_app/immutable/chunks/store.OvVdU9FR.js","_app/immutable/chunks/entry.gCyvCV8D.js","_app/immutable/chunks/index.ByVJs9fc.js","_app/immutable/chunks/stores.LAr7rbsW.js","_app/immutable/chunks/index-client.B1a3lc01.js"];
export const stylesheets = ["_app/immutable/assets/0.BoGBg2-O.css"];
export const fonts = [];
