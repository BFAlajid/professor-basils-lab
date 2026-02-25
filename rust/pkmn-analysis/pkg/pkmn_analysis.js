/* @ts-self-types="./pkmn_analysis.d.ts" */

/**
 * Analyze defensive coverage for a team.
 *
 * team_types: flat array [t1a, t1b, t2a, t2b, ...] — pairs of type indices per Pokemon
 * team_size: number of Pokemon
 *
 * Returns a flat Vec<f64> with 18 entries of 4 values each (72 total):
 * For each attacking type (0-17):
 *   [defensive_status, offensive_covered, worst_multiplier, best_multiplier]
 *   defensive_status: 0 = neutral, 1 = resist, 2 = weak
 *   offensive_covered: 1.0 if any team member has this as a type (STAB coverage), else 0.0
 *   worst_multiplier: highest defensive multiplier among team members
 *   best_multiplier: lowest defensive multiplier among team members
 * @param {Uint8Array} team_types
 * @param {number} team_size
 * @returns {Float64Array}
 */
export function analyze_defensive_coverage(team_types, team_size) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(team_types, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.analyze_defensive_coverage(retptr, ptr0, len0, team_size);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v2 = getArrayF64FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 8, 8);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Analyze a team's defensive weaknesses, offensive coverage, and threat score.
 *
 * team_types: flat array [t1a, t1b, t2a, t2b, ...] — pairs of type indices per Pokemon
 *   Use 255 for second type if mono-type.
 * team_size: number of Pokemon on the team (team_types.len() / 2)
 *
 * Returns a flat Vec<f64> with the following layout:
 * [0..54]: Defensive chart — 18 triples of (weakCount, resistCount, immuneCount), one per attacking type
 * [54]: Threat score (0-100)
 * [55]: Number of uncovered weaknesses (N)
 * [56..56+N]: Uncovered weakness type indices
 * [56+N]: Number of offensive coverage types (M)
 * [57+N..57+N+M]: Covered type indices
 * [57+N+M]: Number of offensive gaps (G)
 * [58+N+M..58+N+M+G]: Gap type indices
 * [58+N+M+G]: Number of suggestions (S, max 3)
 * Then S pairs of (type_idx, score)
 * @param {Uint8Array} team_types
 * @param {number} team_size
 * @returns {Float64Array}
 */
export function analyze_team(team_types, team_size) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(team_types, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.analyze_team(retptr, ptr0, len0, team_size);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v2 = getArrayF64FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 8, 8);
        return v2;
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
        "./pkmn_analysis_bg.js": import0,
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

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat64ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
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
        module_or_path = new URL('pkmn_analysis_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
