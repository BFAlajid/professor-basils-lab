import { StatusCondition, BallType, CatchContext } from "@/types";
import { getBallModifier } from "@/data/pokeBalls";

export function getStatusModifier(status: StatusCondition): number {
  if (status === "sleep" || status === "freeze") return 2.5;
  if (status === "paralyze" || status === "poison" || status === "toxic" || status === "burn") return 1.5;
  return 1;
}

export function calculateCatchProbability(
  captureRate: number,
  currentHp: number,
  maxHp: number,
  status: StatusCondition,
  ball: BallType,
  context: CatchContext
): { shakeChecks: boolean[]; isCaught: boolean } {
  if (ball === "master-ball") {
    return { shakeChecks: [true, true, true, true], isCaught: true };
  }

  const ballMod = getBallModifier(ball, context);
  const statusMod = getStatusModifier(status);

  const modifiedRate = Math.min(
    255,
    ((3 * maxHp - 2 * currentHp) * captureRate * ballMod) / (3 * maxHp) * statusMod
  );

  if (modifiedRate >= 255) {
    return { shakeChecks: [true, true, true, true], isCaught: true };
  }

  const shakeProbability = 65536 / Math.pow(255 / modifiedRate, 0.1875);

  const shakeChecks: boolean[] = [];
  for (let i = 0; i < 4; i++) {
    const roll = Math.random() * 65536;
    shakeChecks.push(roll < shakeProbability);
    if (roll >= shakeProbability) break;
  }

  const isCaught = shakeChecks.length === 4 && shakeChecks.every((s) => s);
  return { shakeChecks, isCaught };
}

export function shouldWildFlee(captureRate: number, turn: number): boolean {
  const baseFlee = Math.max(0, (255 - captureRate) / 255) * 0.15;
  const turnBonus = turn * 0.02;
  return Math.random() < Math.min(0.3, baseFlee + turnBonus);
}
