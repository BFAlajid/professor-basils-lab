/* @ts-self-types="./pkmn_catch_rate.d.ts" */

/**
 * Calculate catch probability and simulate 4 shake checks.
 *
 * Parameters:
 * - `capture_rate`: The Pokemon's base capture rate (1-255)
 * - `current_hp`: Current HP of the wild Pokemon
 * - `max_hp`: Maximum HP of the wild Pokemon
 * - `status_mod`: Status modifier (1.0 = none, 1.5 = paralyze/burn/poison/toxic, 2.5 = sleep/freeze)
 * - `ball_mod`: Ball modifier (pre-resolved by TS from `getBallModifier`)
 * - `seed`: Random seed (from JS `Math.random()`, scaled to u32)
 *
 * Returns a `Vec<f64>` of 6 values:
 * `[is_caught (0 or 1), num_shakes, shake1, shake2, shake3, shake4]`
 *
 * Each shake is 0 (fail) or 1 (pass). `num_shakes` is 1-4.
 *
 * Special case: if `ball_mod >= 255` (Master Ball), always caught.
 * @param {number} capture_rate
 * @param {number} current_hp
 * @param {number} max_hp
 * @param {number} status_mod
 * @param {number} ball_mod
 * @param {number} seed
 * @returns {Float64Array}
 */
export function calculate_catch_probability(capture_rate, current_hp, max_hp, status_mod, ball_mod, seed) {
    const ret = wasm.calculate_catch_probability(capture_rate, current_hp, max_hp, status_mod, ball_mod, seed);
    var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v1;
}

/**
 * Determine if a wild Pokemon should flee.
 *
 * Parameters:
 * - `capture_rate`: The Pokemon's base capture rate (1-255)
 * - `turn`: Current battle turn number
 * - `seed`: Random seed
 *
 * Returns `1.0` if the Pokemon flees, `0.0` otherwise.
 * @param {number} capture_rate
 * @param {number} turn
 * @param {number} seed
 * @returns {number}
 */
export function should_wild_flee(capture_rate, turn, seed) {
    const ret = wasm.should_wild_flee(capture_rate, turn, seed);
    return ret;
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./pkmn_catch_rate_bg.js": import0,
    };
}

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat64ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('pkmn_catch_rate_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
