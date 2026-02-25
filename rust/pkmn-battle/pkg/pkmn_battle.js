/* @ts-self-types="./pkmn_battle.d.ts" */

/**
 * Determine which player goes first based on priority and speed.
 *
 * Returns 1.0 if player 1 goes first, 0.0 if player 2 goes first.
 *
 * Logic:
 * - Higher priority goes first
 * - Same priority: higher speed goes first
 * - Same speed: random (50/50 using seed)
 * @param {number} p1_priority
 * @param {number} p2_priority
 * @param {number} p1_speed
 * @param {number} p2_speed
 * @param {number} seed
 * @returns {number}
 */
export function determine_turn_order(p1_priority, p2_priority, p1_speed, p2_speed, seed) {
    const ret = wasm.determine_turn_order(p1_priority, p2_priority, p1_speed, p2_speed, seed);
    return ret;
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

/**
 * Score how well a Pokemon matches up against an opponent.
 * Used for switch-in decisions.
 *
 * Parameters:
 * - `switch_type1`, `switch_type2`: Switch-in's types (255 for mono)
 * - `opp_type1`, `opp_type2`: Opponent's types (255 for mono)
 * - `hp_ratio`: Switch-in's current HP / max HP (0.0 - 1.0)
 *
 * Logic (matching JS `scoreMatchup`):
 * - Start at 50
 * - For each opponent type (as attacker): check defensive_multiplier vs switch's types
 *   - mult < 1 (resist): +20
 *   - mult == 0 (immune): +40
 *   - mult > 1 (weak): -20
 * - For each switch type (as attacker): check defensive_multiplier vs opponent's types
 *   - mult > 1 (super effective): +15
 * - Multiply final score by hp_ratio
 * @param {number} switch_type1
 * @param {number} switch_type2
 * @param {number} opp_type1
 * @param {number} opp_type2
 * @param {number} hp_ratio
 * @returns {number}
 */
export function score_matchup(switch_type1, switch_type2, opp_type1, opp_type2, hp_ratio) {
    const ret = wasm.score_matchup(switch_type1, switch_type2, opp_type1, opp_type2, hp_ratio);
    return ret;
}

/**
 * Score a single move against a target.
 *
 * Returns a score representing how effective this move is.
 *
 * Parameters:
 * - `power`: Move base power (0 for status moves)
 * - `move_type`: Type index of the move (0-17)
 * - `attacker_type1`: Attacker's first type (0-17)
 * - `attacker_type2`: Attacker's second type (255 for mono)
 * - `defender_type1`: Defender's first type (0-17)
 * - `defender_type2`: Defender's second type (255 for mono)
 * - `accuracy`: Move accuracy (0-100)
 * - `is_status`: Whether this is a status move
 *
 * Logic (matching JS `scoreMoveAgainstTarget`):
 * - Status moves: return 40
 * - No power (0): return 10
 * - STAB: 1.5x if move_type matches either attacker type
 * - Type effectiveness via `get_defensive_multiplier`
 * - Score = power * stab * type_eff * (accuracy / 100)
 * @param {number} power
 * @param {number} move_type
 * @param {number} attacker_type1
 * @param {number} attacker_type2
 * @param {number} defender_type1
 * @param {number} defender_type2
 * @param {number} accuracy
 * @param {boolean} is_status
 * @returns {number}
 */
export function score_move(power, move_type, attacker_type1, attacker_type2, defender_type1, defender_type2, accuracy, is_status) {
    const ret = wasm.score_move(power, move_type, attacker_type1, attacker_type2, defender_type1, defender_type2, accuracy, is_status);
    return ret;
}

/**
 * Select the best AI action given pre-computed scores.
 *
 * Parameters:
 * - `move_scores`: flat array of f64 scores for each move (up to 4)
 * - `num_moves`: number of moves (1-4)
 * - `switch_scores`: flat array of (index, score) pairs for alive switch-ins
 * - `num_switches`: number of available switch-ins
 * - `difficulty`: 0 = easy, 1 = normal, 2 = hard
 * - `seed`: random seed for difficulty-based randomness
 * - `is_fainted`: whether AI active Pokemon is fainted (need forced switch)
 * - `can_mega`: can Mega Evolve (bool)
 * - `can_tera`: can Terastallize (bool)
 * - `should_tera`: whether terastallization is recommended (pre-computed by TS)
 * - `can_dmax`: can Dynamax (bool)
 * - `should_dmax`: whether dynamax is recommended (pre-computed by TS)
 *
 * Returns Vec<f64> of 2 values: [action_type, action_value]
 * action_type: 0 = MOVE, 1 = SWITCH, 2 = MEGA_EVOLVE, 3 = TERASTALLIZE, 4 = DYNAMAX
 * action_value: move index (0-3) or Pokemon index for switch
 * @param {Float64Array} move_scores
 * @param {number} num_moves
 * @param {Float64Array} switch_scores
 * @param {number} num_switches
 * @param {number} difficulty
 * @param {number} seed
 * @param {boolean} is_fainted
 * @param {boolean} can_mega
 * @param {boolean} can_tera
 * @param {boolean} should_tera
 * @param {boolean} can_dmax
 * @param {boolean} should_dmax
 * @returns {Float64Array}
 */
export function select_ai_action(move_scores, num_moves, switch_scores, num_switches, difficulty, seed, is_fainted, can_mega, can_tera, should_tera, can_dmax, should_dmax) {
    const ptr0 = passArrayF64ToWasm0(move_scores, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(switch_scores, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.select_ai_action(ptr0, len0, num_moves, ptr1, len1, num_switches, difficulty, seed, is_fainted, can_mega, can_tera, should_tera, can_dmax, should_dmax);
    var v3 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v3;
}

/**
 * Determine if AI should Dynamax.
 *
 * Returns 1.0 = yes, 0.0 = no.
 *
 * Logic (matching JS `shouldDynamax`):
 * 1. Always Dynamax if alive_count <= 1
 * 2. Hard: if HP > 80%, 60% chance. Else return 0.0.
 * 3. Easy: if alive <= 2, 50% chance. Else 15% chance.
 * 4. Normal: if HP > 70%, 50% chance. Else return 0.0.
 * @param {number} hp_ratio
 * @param {number} alive_count
 * @param {number} difficulty
 * @param {number} seed
 * @returns {number}
 */
export function should_dynamax(hp_ratio, alive_count, difficulty, seed) {
    const ret = wasm.should_dynamax(hp_ratio, alive_count, difficulty, seed);
    return ret;
}

/**
 * Determine if AI should Terastallize.
 *
 * Returns 1.0 = yes, 0.0 = no.
 *
 * Logic (matching JS `shouldTerastallize`):
 * 1. For each opponent type: check if it's super effective vs AI types.
 *    If yes, check if tera type would fix this (mult <= 1). If so, return 1.0.
 * 2. Hard: if HP > 50%, 25% chance. Else return 0.0.
 * 3. Easy: 15% chance.
 * 4. Normal: if HP > 60%, 40% chance. Else return 0.0.
 * @param {number} ai_type1
 * @param {number} ai_type2
 * @param {number} opp_type1
 * @param {number} opp_type2
 * @param {number} tera_type
 * @param {number} hp_ratio
 * @param {number} difficulty
 * @param {number} seed
 * @returns {number}
 */
export function should_terastallize(ai_type1, ai_type2, opp_type1, opp_type2, tera_type, hp_ratio, difficulty, seed) {
    const ret = wasm.should_terastallize(ai_type1, ai_type2, opp_type1, opp_type2, tera_type, hp_ratio, difficulty, seed);
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
        "./pkmn_battle_bg.js": import0,
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

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let WASM_VECTOR_LEN = 0;

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
        throw new Error('WASM path must be provided');
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
