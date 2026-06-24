import * as universal from '../entries/pages/_page.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+page.ts";
export const imports = ["_app/immutable/nodes/2.C_O6hshc.js","_app/immutable/chunks/disclose-version.MBpbH8Sa.js","_app/immutable/chunks/runtime.BDO5jb-F.js","_app/immutable/chunks/if.D-bS588Z.js","_app/immutable/chunks/class.CtGEUSPq.js","_app/immutable/chunks/store.OvVdU9FR.js","_app/immutable/chunks/index-client.B1a3lc01.js","_app/immutable/chunks/index.ByVJs9fc.js","_app/immutable/chunks/minimize-icon.BrSCFa0i.js","_app/immutable/chunks/entry.gCyvCV8D.js"];
export const stylesheets = ["_app/immutable/assets/2._BbzeoRX.css"];
export const fonts = [];
