"use client";

import { useState } from "react";
import { BATTLE_ITEMS, getBattleItem } from "@/data/battleItems";
import ItemSprite from "@/components/ItemSprite";

interface ItemPanelProps {
  inventory: Record<string, number>; // itemId -> quantity
  playerPokemon: {
    currentHp: number;
    maxHp: number;
    isFainted: boolean;
    status: string | null;
    name: string;
  }[];
  activePokemonIndex: number;
  onUseItem: (itemId: string, targetIndex?: number) => void;
  onCancel: () => void;
}

export default function ItemPanel({
  inventory,
  playerPokemon,
  activePokemonIndex,
  onUseItem,
  onCancel,
}: ItemPanelProps) {
  const [selectingTarget, setSelectingTarget] = useState<string | null>(null);

  const handleItemClick = (itemId: string) => {
    const item = getBattleItem(itemId);
    if (!item) return;

    const qty = inventory[itemId] ?? 0;
    if (qty <= 0) return;

    if (item.effect === "revive") {
      // Need to pick a fainted target
      const hasFaintedTarget = playerPokemon.some((p) => p.isFainted);
      if (!hasFaintedTarget) return;
      setSelectingTarget(itemId);
    } else {
      // heal / cure_status — use on active Pokemon directly
      onUseItem(itemId, activePokemonIndex);
    }
  };

  const handleTargetSelect = (targetIndex: number) => {
    if (!selectingTarget) return;
    onUseItem(selectingTarget, targetIndex);
    setSelectingTarget(null);
  };

  // --- Target selection sub-view for revive ---
  if (selectingTarget) {
    const item = getBattleItem(selectingTarget);
    const faintedMembers = playerPokemon
      .map((p, i) => ({ ...p, index: i }))
      .filter((p) => p.isFainted);

    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold font-pixel text-[#f0f0e8]">
            Use {item?.name ?? "Item"} on...
          </h4>
          <button
            onClick={() => setSelectingTarget(null)}
            className="text-xs text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors font-pixel"
          >
            Back
          </button>
        </div>

        {faintedMembers.length === 0 ? (
          <p className="text-sm text-[#8b9bb4] font-pixel">
            No fainted Pokemon in your party
          </p>
        ) : (
          <div className="space-y-2">
            {faintedMembers.map((p) => (
              <button
                key={p.index}
                onClick={() => handleTargetSelect(p.index)}
                className="flex w-full items-center justify-between rounded-lg bg-[#1a1c2c] px-3 py-2 text-left hover:bg-[#3a4466] transition-colors"
              >
                <span className="text-sm font-pixel capitalize text-[#f0f0e8]">
                  {p.name}
                </span>
                <span className="text-[10px] font-pixel text-[#8b9bb4]">
                  Fainted
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Main item list view ---
  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold font-pixel text-[#f0f0e8]">
          Use Item
        </h4>
        <button
          onClick={onCancel}
          className="text-xs text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors font-pixel"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-2">
        {BATTLE_ITEMS.map((item) => {
          const qty = inventory[item.id] ?? 0;
          const isEmpty = qty <= 0;

          // For revive, also disable if no fainted Pokemon
          const noValidTarget =
            item.effect === "revive" &&
            !playerPokemon.some((p) => p.isFainted);

          // For heal items, disable if active Pokemon is fainted or at full HP
          const activePkm = playerPokemon[activePokemonIndex];
          const healUseless =
            item.effect === "heal" &&
            activePkm &&
            (activePkm.isFainted || activePkm.currentHp >= activePkm.maxHp);

          const disabled = isEmpty || noValidTarget || healUseless;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              disabled={disabled}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                disabled
                  ? "bg-[#1a1c2c] opacity-40 cursor-not-allowed"
                  : "bg-[#1a1c2c] hover:bg-[#3a4466] cursor-pointer"
              }`}
            >
              <ItemSprite name={item.id} size={24} />
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-pixel text-[#f0f0e8]">
                  {item.name}
                </span>
                <span className="block text-[10px] font-pixel text-[#8b9bb4] mt-0.5">
                  {item.description}
                </span>
              </div>
              <span
                className={`text-xs font-pixel tabular-nums ml-3 ${
                  isEmpty ? "text-[#8b9bb4]" : "text-[#f0f0e8]"
                }`}
              >
                x{qty}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
