"use client";

import { Nature, EVSpread, IVSpread } from "@/types";
import { NATURES, getNatureLabel } from "@/data/natures";
import { HELD_ITEMS } from "@/data/heldItems";

const inputCls =
  "w-full rounded border border-[#3a4466] bg-[#1a1c2c] px-2 py-1.5 text-xs text-[#f0f0e8] outline-none focus:border-[#e8433f]";
const selectCls =
  "w-full rounded border border-[#3a4466] bg-[#1a1c2c] px-2 py-1.5 text-xs text-[#f0f0e8] outline-none focus:border-[#e8433f]";
const lblCls = "block text-[10px] text-[#8b9bb4] mb-0.5";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function NumInput({
  label,
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ariaLabel?: string;
}) {
  return (
    <div>
      <label className={lblCls}>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(clamp(parseInt(e.target.value) || min, min, max))
        }
        className={inputCls}
        aria-label={ariaLabel ?? label}
      />
    </div>
  );
}

interface PokemonCalcPanelProps {
  sideLabel: string;
  isAttacker: boolean;
  level: number;
  setLevel: (v: number) => void;
  nature: Nature | null;
  setNature: (v: Nature | null) => void;
  evs: EVSpread;
  setEvs: React.Dispatch<React.SetStateAction<EVSpread>>;
  ivs: IVSpread;
  setIvs: React.Dispatch<React.SetStateAction<IVSpread>>;
  item: string;
  setItem: (v: string) => void;
  ability: string;
  setAbility: (v: string) => void;
}

export default function PokemonCalcPanel({
  sideLabel,
  isAttacker,
  level,
  setLevel,
  nature,
  setNature,
  evs,
  setEvs,
  ivs,
  setIvs,
  item,
  setItem,
  ability,
  setAbility,
}: PokemonCalcPanelProps) {
  return (
    <div className="space-y-2 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
      <div className="grid grid-cols-2 gap-2">
        <NumInput
          label="Level"
          value={level}
          min={1}
          max={100}
          onChange={setLevel}
          ariaLabel={`${sideLabel} level`}
        />
        <div>
          <label className={lblCls}>Nature</label>
          <select
            value={nature?.name ?? ""}
            onChange={(e) => {
              const found = NATURES.find((n) => n.name === e.target.value);
              setNature(found ?? null);
            }}
            className={selectCls}
            aria-label={`${sideLabel} nature`}
          >
            <option value="">None</option>
            {NATURES.map((n) => (
              <option key={n.name} value={n.name}>
                {getNatureLabel(n)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isAttacker ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="Atk EVs" value={evs.attack} min={0} max={252}
              onChange={(v) => setEvs((prev) => ({ ...prev, attack: v }))}
              ariaLabel={`${sideLabel} attack EVs`} />
            <NumInput label="SpA EVs" value={evs.spAtk} min={0} max={252}
              onChange={(v) => setEvs((prev) => ({ ...prev, spAtk: v }))}
              ariaLabel={`${sideLabel} special attack EVs`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="Atk IVs" value={ivs.attack} min={0} max={31}
              onChange={(v) => setIvs((prev) => ({ ...prev, attack: v }))}
              ariaLabel={`${sideLabel} attack IVs`} />
            <NumInput label="SpA IVs" value={ivs.spAtk} min={0} max={31}
              onChange={(v) => setIvs((prev) => ({ ...prev, spAtk: v }))}
              ariaLabel={`${sideLabel} special attack IVs`} />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <NumInput label="HP EVs" value={evs.hp} min={0} max={252}
              onChange={(v) => setEvs((prev) => ({ ...prev, hp: v }))}
              ariaLabel={`${sideLabel} HP EVs`} />
            <NumInput label="Def EVs" value={evs.defense} min={0} max={252}
              onChange={(v) => setEvs((prev) => ({ ...prev, defense: v }))}
              ariaLabel={`${sideLabel} defense EVs`} />
            <NumInput label="SpD EVs" value={evs.spDef} min={0} max={252}
              onChange={(v) => setEvs((prev) => ({ ...prev, spDef: v }))}
              ariaLabel={`${sideLabel} special defense EVs`} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumInput label="HP IVs" value={ivs.hp} min={0} max={31}
              onChange={(v) => setIvs((prev) => ({ ...prev, hp: v }))}
              ariaLabel={`${sideLabel} HP IVs`} />
            <NumInput label="Def IVs" value={ivs.defense} min={0} max={31}
              onChange={(v) => setIvs((prev) => ({ ...prev, defense: v }))}
              ariaLabel={`${sideLabel} defense IVs`} />
            <NumInput label="SpD IVs" value={ivs.spDef} min={0} max={31}
              onChange={(v) => setIvs((prev) => ({ ...prev, spDef: v }))}
              ariaLabel={`${sideLabel} special defense IVs`} />
          </div>
        </>
      )}

      <div>
        <label className={lblCls}>Held Item</label>
        <select
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className={selectCls}
          aria-label={`${sideLabel} held item`}
        >
          <option value="">None</option>
          {HELD_ITEMS.map((it) => (
            <option key={it.name} value={it.name}>
              {it.displayName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={lblCls}>Ability</label>
        <input
          type="text"
          value={ability}
          onChange={(e) => setAbility(e.target.value)}
          placeholder={isAttacker ? "e.g. huge-power" : "e.g. multiscale"}
          className={inputCls}
          aria-label={`${sideLabel} ability`}
        />
      </div>
    </div>
  );
}
