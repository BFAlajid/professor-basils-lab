/* @ts-self-types="./pkmn_stats.d.ts" */

/**
 * Calculate all 6 stats at once.
 *
 * Parameters are ordered: bases (hp, atk, def, spa, spd, spe),
 * IVs (hp, atk, def, spa, spd, spe), EVs (hp, atk, def, spa, spd, spe),
 * nature modifiers (atk, def, spa, spd, spe). HP has no nature modifier.
 *
 * Returns a Vec<u32> of [hp, atk, def, spa, spd, spe].
 * @param {number} hp_base
 * @param {number} atk_base
 * @param {number} def_base
 * @param {number} spa_base
 * @param {number} spd_base
 * @param {number} spe_base
 * @param {number} hp_iv
 * @param {number} atk_iv
 * @param {number} def_iv
 * @param {number} spa_iv
 * @param {number} spd_iv
 * @param {number} spe_iv
 * @param {number} hp_ev
 * @param {number} atk_ev
 * @param {number} def_ev
 * @param {number} spa_ev
 * @param {number} spd_ev
 * @param {number} spe_ev
 * @param {number} atk_nature
 * @param {number} def_nature
 * @param {number} spa_nature
 * @param {number} spd_nature
 * @param {number} spe_nature
 * @returns {Uint32Array}
 */
export function calculate_all_stats(hp_base, atk_base, def_base, spa_base, spd_base, spe_base, hp_iv, atk_iv, def_iv, spa_iv, spd_iv, spe_iv, hp_ev, atk_ev, def_ev, spa_ev, spd_ev, spe_ev, atk_nature, def_nature, spa_nature, spd_nature, spe_nature) {
    const ret = wasm.calculate_all_stats(hp_base, atk_base, def_base, spa_base, spd_base, spe_base, hp_iv, atk_iv, def_iv, spa_iv, spd_iv, spe_iv, hp_ev, atk_ev, def_ev, spa_ev, spd_ev, spe_ev, atk_nature, def_nature, spa_nature, spd_nature, spe_nature);
    var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Calculate HP stat for a Pokemon.
 *
 * HP formula: floor(((2*base + iv + floor(ev/4)) * level) / 100) + level + 10
 * Special case: if base is 1 (Shedinja), always return 1.
 * @param {number} base
 * @param {number} iv
 * @param {number} ev
 * @param {number} level
 * @returns {number}
 */
export function calculate_hp(base, iv, ev, level) {
    const ret = wasm.calculate_hp(base, iv, ev, level);
    return ret >>> 0;
}

/**
 * Calculate a single non-HP stat for a Pokemon.
 *
 * Stat formula: floor((floor(((2*base + iv + floor(ev/4)) * level) / 100) + 5) * nature_modifier)
 * Nature modifier: 1.1 (boosted), 0.9 (hindered), 1.0 (neutral).
 * @param {number} base
 * @param {number} iv
 * @param {number} ev
 * @param {number} nature_modifier
 * @param {number} level
 * @returns {number}
 */
export function calculate_stat(base, iv, ev, nature_modifier, level) {
    const ret = wasm.calculate_stat(base, iv, ev, nature_modifier, level);
    return ret >>> 0;
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
        "./pkmn_stats_bg.js": import0,
    };
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedUint32ArrayMemory0 = null;
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
        module_or_path = new URL('pkmn_stats_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
