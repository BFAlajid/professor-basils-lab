"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "@/components/PokeImage";
import { fetchEvolutionChain, EvolutionNode } from "@/utils/evolutionChain";

interface EvolutionTreeViewerProps {
  pokemonId: number;
}

function formatName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function getConditionLabel(node: EvolutionNode): string {
  if (node.evolutionDetails.length === 0) return "";
  const d = node.evolutionDetails[0];
  return d.trigger;
}

function TreeNode({
  node,
  isRoot,
  highlightId,
}: {
  node: EvolutionNode;
  isRoot: boolean;
  highlightId: number;
}) {
  const isHighlighted = node.speciesId === highlightId;
  const condition = getConditionLabel(node);

  return (
    <div className="flex items-center gap-1">
      {!isRoot && (
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex flex-col items-center">
            {condition && (
              <span className="text-[#8b9bb4] text-[9px] text-center max-w-[70px] leading-tight whitespace-nowrap">
                {condition}
              </span>
            )}
            <span className="text-[#3a4466] text-sm">{"\u2192"}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`flex flex-col items-center shrink-0 rounded-lg p-1.5 ${
            isHighlighted
              ? "bg-[#38b764]/20 border border-[#38b764]"
              : "bg-[#1a1c2c] border border-[#3a4466]"
          }`}
          aria-label={`${formatName(node.speciesName)} evolution node`}
        >
          <Image
            src={getSpriteUrl(node.speciesId)}
            alt={node.speciesName}
            width={48}
            height={48}
            unoptimized
          />
          <span
            className={`text-[10px] font-pixel ${
              isHighlighted ? "text-[#38b764]" : "text-[#f0f0e8]"
            }`}
          >
            {formatName(node.speciesName)}
          </span>
        </motion.div>

        {node.evolvesTo.length > 0 && (
          <div className="flex flex-col gap-2">
            {node.evolvesTo.map((child) => (
              <TreeNode
                key={child.speciesId}
                node={child}
                isRoot={false}
                highlightId={highlightId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EvolutionTreeViewer({ pokemonId }: EvolutionTreeViewerProps) {
  const [chain, setChain] = useState<EvolutionNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchEvolutionChain(pokemonId).then((result) => {
      if (cancelled) return;
      if (result) {
        setChain(result);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [pokemonId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <div className="animate-pulse space-y-3 py-4">
          <p className="text-[#8b9bb4] font-pixel text-xs text-center">
            Loading evolution chain...
          </p>
          <div className="flex items-center justify-center gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-14 h-14 bg-[#3a4466] rounded-lg" />
                {i < 2 && <div className="w-6 h-1 bg-[#3a4466] rounded" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !chain) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <p className="text-[#8b9bb4] font-pixel text-xs text-center py-4">
          Evolution chain not available.
        </p>
      </div>
    );
  }

  const isStandalone = chain.evolvesTo.length === 0;

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-3">
      <h3 className="text-sm font-pixel text-[#f0f0e8]">Evolution Chain</h3>

      {isStandalone ? (
        <p className="text-[#8b9bb4] text-xs font-pixel text-center py-2">
          {formatName(chain.speciesName)} does not evolve.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex items-start min-w-fit py-2">
            <TreeNode node={chain} isRoot={true} highlightId={pokemonId} />
          </div>
        </div>
      )}
    </div>
  );
}
