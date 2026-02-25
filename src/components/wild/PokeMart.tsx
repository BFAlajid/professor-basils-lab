"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { POKEMART_ITEMS, type ShopItem } from "@/data/pokeMart";
import { BallType } from "@/types";

type ShopCategory = "ball" | "medicine" | "held-item" | "special";

interface PokeMartProps {
  money: number;
  onBuy: (item: ShopItem, quantity: number) => boolean;
  ballInventory: Record<BallType, number>;
  battleItemInventory: Record<string, number>;
  ownedItems: Record<string, number>;
}

const CATEGORY_LABELS: Record<ShopCategory, string> = {
  ball: "Poke Balls",
  medicine: "Medicine",
  "held-item": "Held Items",
  special: "Special",
};

const CATEGORY_COLORS: Record<ShopCategory, string> = {
  ball: "#e8433f",
  medicine: "#38b764",
  "held-item": "#4a90d9",
  special: "#f7a838",
};

export default function PokeMart({ money, onBuy, ballInventory, battleItemInventory, ownedItems }: PokeMartProps) {
  const [activeCategory, setActiveCategory] = useState<ShopCategory>("ball");
  const [buyQuantity, setBuyQuantity] = useState<Record<string, number>>({});
  const [flashItem, setFlashItem] = useState<string | null>(null);

  const items = useMemo(
    () => POKEMART_ITEMS.filter((i) => i.category === activeCategory),
    [activeCategory]
  );

  function getOwned(item: ShopItem): number {
    if (item.ballType) return ballInventory[item.ballType] ?? 0;
    if (item.category === "medicine") return battleItemInventory[item.id] ?? 0;
    return ownedItems[item.id] ?? 0;
  }

  function handleBuy(item: ShopItem) {
    const qty = buyQuantity[item.id] || 1;
    const success = onBuy(item, qty);
    if (success) {
      setFlashItem(item.id);
      setTimeout(() => setFlashItem(null), 600);
      setBuyQuantity((prev) => ({ ...prev, [item.id]: 1 }));
    }
  }

  function setQty(itemId: string, qty: number) {
    setBuyQuantity((prev) => ({ ...prev, [itemId]: Math.max(1, Math.min(99, qty)) }));
  }

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-pixel text-sm text-[#f0f0e8]">PokeMart</h3>
        <div className="font-pixel text-xs text-[#f7a838]">
          ¥{money.toLocaleString()}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-3">
        {(Object.keys(CATEGORY_LABELS) as ShopCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-2 py-1 text-[9px] font-pixel rounded border transition-colors"
            style={{
              color: activeCategory === cat ? CATEGORY_COLORS[cat] : "#8b9bb4",
              borderColor: activeCategory === cat ? CATEGORY_COLORS[cat] : "#3a4466",
              backgroundColor: activeCategory === cat ? `${CATEGORY_COLORS[cat]}15` : "transparent",
            }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {items.map((item) => {
            const qty = buyQuantity[item.id] || 1;
            const totalCost = item.price * qty;
            const canAfford = money >= totalCost;
            const owned = getOwned(item);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  backgroundColor: flashItem === item.id ? "#38b76430" : "#262b44",
                }}
                exit={{ opacity: 0, x: 10 }}
                className="rounded-lg border border-[#3a4466] p-2 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-[10px] text-[#f0f0e8] truncate">
                      {item.name}
                    </span>
                    {owned > 0 && (
                      <span className="font-pixel text-[8px] text-[#8b9bb4]">
                        ×{owned}
                      </span>
                    )}
                  </div>
                  <p className="font-pixel text-[8px] text-[#8b9bb4] truncate">
                    {item.description}
                  </p>
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQty(item.id, qty - 1)}
                    className="w-4 h-4 rounded bg-[#3a4466] text-[#8b9bb4] text-[9px] flex items-center justify-center hover:text-[#f0f0e8]"
                    disabled={qty <= 1}
                  >
                    -
                  </button>
                  <span className="font-pixel text-[9px] text-[#f0f0e8] w-4 text-center">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(item.id, qty + 1)}
                    className="w-4 h-4 rounded bg-[#3a4466] text-[#8b9bb4] text-[9px] flex items-center justify-center hover:text-[#f0f0e8]"
                  >
                    +
                  </button>
                </div>

                {/* Price + Buy */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-pixel text-[9px] ${canAfford ? "text-[#f7a838]" : "text-[#e8433f]"}`}>
                    ¥{totalCost.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford}
                    className="px-2 py-0.5 text-[9px] font-pixel rounded bg-[#38b764] text-[#f0f0e8] hover:bg-[#2a9654] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Buy
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
