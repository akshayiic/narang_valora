import { l as current_component } from "./index2.js";
function onDestroy(fn) {
  var context = (
    /** @type {import('#server').Component} */
    current_component
  );
  (context.d ??= []).push(fn);
}
export {
  onDestroy as o
};
