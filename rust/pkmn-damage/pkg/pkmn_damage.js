/* @ts-self-types="./pkmn_damage.d.ts" */

/**
 * Calculate damage given pre-resolved numeric inputs.
 * The TS wrapper handles extracting stats, looking up items/abilities, etc.
 *
 * Parameters:
 * - `effective_atk`: The attacker's calculated atk or spAtk stat (nature/EVs/IVs applied)
 * - `effective_def`: The defender's calculated def or spDef stat (nature/EVs/IVs applied)
 * - `move_power`: The move's base power
 * - `move_type`: Type index (0-17) for the move
 * - `def_type1`: Defender's first type index (0-17)
 * - `def_type2`: Defender's second type index, or 255 for mono-type
 * - `stab`: STAB multiplier (1.0, 1.5, or 2.0 for Tera), pre-calculated by TS
 * - `is_critical`: Whether this is a critical hit
 * - `weather`: 0=none, 1=sun, 2=rain, 3=sandstorm, 4=hail
 * - `move_is_fire`: Whether the move is Fire type (for weather interaction)
 * - `move_is_water`: Whether the move is Water type (for weather interaction)
 * - `item_damage_mult`: Pre-resolved item damage multiplier (1.0 if no item applies)
 * - `ability_atk_mult`: Pre-resolved ability attack multiplier (1.0 if no ability applies)
 * - `is_burned_physical`: Whether attacker is burned AND move is physical AND no Guts
 * - `atk_stage`: Attack stat stage (-6 to +6)
 * - `def_stage`: Defense stat stage (-6 to +6)
 * - `def_item_spdef_mult`: Defender's special defense item multiplier (e.g. Assault Vest)
 * - `is_physical`: Whether the move is physical
 *
 * Returns a `Vec<f64>` of 5 values:
 * `[min_damage, max_damage, effectiveness, stab_was_applied, is_critical]`
 * @param {number} effective_atk
 * @param {number} effective_def
 * @param {number} move_power
 * @param {number} move_type
 * @param {number} def_type1
 * @param {number} def_type2
 * @param {number} stab
 * @param {boolean} is_critical
 * @param {number} weather
 * @param {boolean} move_is_fire
 * @param {boolean} move_is_water
 * @param {number} item_damage_mult
 * @param {number} ability_atk_mult
 * @param {boolean} is_burned_physical
 * @param {number} atk_stage
 * @param {number} def_stage
 * @param {number} def_item_spdef_mult
 * @param {boolean} is_physical
 * @returns {Float64Array}
 */
export function calculate_damage(effective_atk, effective_def, move_power, move_type, def_type1, def_type2, stab, is_critical, weather, move_is_fire, move_is_water, item_damage_mult, ability_atk_mult, is_burned_physical, atk_stage, def_stage, def_item_spdef_mult, is_physical) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.calculate_damage(retptr, effective_atk, effective_def, move_power, move_type, def_type1, def_type2, stab, is_critical, weather, move_is_fire, move_is_water, item_damage_mult, ability_atk_mult, is_burned_physical, atk_stage, def_stage, def_item_spdef_mult, is_physical);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v1 = getArrayF64FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export(r0, r1 * 8, 8);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Get the combined defensive multiplier of an attack type vs a dual-type defender.
 * `def_type1` is the primary type index (0-17).
 * `def_type2` is the secondary type index, or -1 for single-type Pokemon.
 * Returns the product of individual effectiveness values.
 * @param {number} atk_type
 * @param {number} def_type1
 * @param {number} def_type2
 * @returns {number}
 */
export function get_defensive_multiplier(atk_type, def_type1, def_type2) {
    const ret = wasm.get_defensive_multiplier(atk_type, def_type1, def_type2);
    return ret;
}

/**
 * Get effectiveness multiplier of attack type vs defend type.
 * Types are passed as u8 indices (0 = Normal through 17 = Fairy).
 * Returns 1.0 (neutral) for out-of-range indices.
 * @param {number} atk_type
 * @param {number} def_type
 * @returns {number}
 */
export function get_effectiveness(atk_type, def_type) {
    const ret = wasm.get_effectiveness(atk_type, def_type);
    return ret;
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
    };
    return {
        __proto__: null,
        "./pkmn_damage_bg.js": import0,
    };
}

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
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
    cachedDataViewMemory0 = null;
    cachedFloat64ArrayMemory0 = null;
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
        module_or_path = new URL('pkmn_damage_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
