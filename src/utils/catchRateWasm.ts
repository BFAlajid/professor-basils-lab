import type { StatusCondition, BallType, CatchContext } from "@/types";
import { getBallModifier } from "@/data/pokeBalls";
import { randomSeed } from "./random";
import {
  calculateCatchProbability as calculateCatchProbability_JS,
  shouldWildFlee as shouldWildFlee_JS,
  getStatusModifier,
} from "./catchRate";
import { createWasmWrapper } from "./createWasmWrapper";

type CatchRateWasmModule = {
  calculate_catch_probability: (
    capture_rate: number,
    current_hp: number,
    max_hp: number,
    status_mod: number,
    ball_mod: number,
    seed: number,
  ) => Float64Array;
  should_wild_flee: (
    capture_rate: number,
    turn: number,
    seed: number,
  ) => number;
};

const wrapper = createWasmWrapper<CatchRateWasmModule>("pkmn-catch-rate", async () => {
  // @ts-ignore — WASM pkg only exists locally after wasm-pack build
  const mod = await import(/* webpackIgnore: true */ "../../rust/pkmn-catch-rate/pkg/pkmn_catch_rate.js");
  await mod.default("/wasm/pkmn_catch_rate_bg.wasm");
  return {
    calculate_catch_probability: mod.calculate_catch_probability,
    should_wild_flee: mod.should_wild_flee,
  };
});

export const ensureWasmReady = wrapper.ensureReady;
export const isWasmActive = wrapper.isActive;

export function calculateCatchProbability(
  captureRate: number,
  currentHp: number,
  maxHp: number,
  status: StatusCondition,
  ball: BallType,
  context: CatchContext
): { shakeChecks: boolean[]; isCaught: boolean } {
  const wasmModule = wrapper.getModule();
  if (wasmModule) {
    try {
      if (ball === "master-ball") {
        return { shakeChecks: [true, true, true, true], isCaught: true };
      }

      const ballMod = getBallModifier(ball, context);
      const statusMod = getStatusModifier(status);
      const seed = randomSeed();

      const result = wasmModule.calculate_catch_probability(
        captureRate,
        currentHp,
        maxHp,
        statusMod,
        ballMod,
        seed,
      );

      // [is_caught, num_shakes, shake1, shake2, shake3, shake4]
      const isCaught = result[0] > 0;
      const numShakes = result[1];
      const shakeChecks: boolean[] = [];
      for (let i = 0; i < numShakes; i++) {
        shakeChecks.push(result[2 + i] > 0);
      }

      return { shakeChecks, isCaught };
    } catch {
      // fall through
    }
  }
  return calculateCatchProbability_JS(captureRate, currentHp, maxHp, status, ball, context);
}

export function shouldWildFlee(captureRate: number, turn: number): boolean {
  const wasmModule = wrapper.getModule();
  if (wasmModule) {
    try {
      return wasmModule.should_wild_flee(captureRate, turn, randomSeed()) > 0;
    } catch {
      // fall through
    }
  }
  return shouldWildFlee_JS(captureRate, turn);
}

export { getStatusModifier } from "./catchRate";
