/**
 * Register the `@/*` path-alias resolve hook for Node ESM scripts.
 * Use: node --import ./scripts/register-ts-paths.mjs ...
 */
import { register } from "node:module";

register("./ts-path-alias-loader.mjs", import.meta.url);
