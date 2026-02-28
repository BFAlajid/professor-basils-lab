"use client";

export type WildPanel =
  | "pcBox"
  | "dayCare"
  | "wonderTrade"
  | "mysteryGift"
  | "linkCable"
  | "safariZone"
  | "gameCorner"
  | "typeQuiz"
  | "fossilLab"
  | "pokeMart"
  | "evTraining"
  | "moveTutor"
  | "berryFarm"
  | "slotMachine"
  | "eggMoves"
  | null;

interface PanelButton {
  id: NonNullable<WildPanel>;
  label: string;
  activeColor: string;
  badge?: string;
}

interface WildToolbarProps {
  activePanel: WildPanel;
  onTogglePanel: (panel: NonNullable<WildPanel>) => void;
  nuzlockeEnabled: boolean;
  onToggleNuzlocke: () => void;
  teamLeadName: string;
  fossilCount: number;
  money: number;
  boxCount: number;
}

export default function WildToolbar({
  activePanel,
  onTogglePanel,
  nuzlockeEnabled,
  onToggleNuzlocke,
  teamLeadName,
  fossilCount,
  money,
  boxCount,
}: WildToolbarProps) {
  const panelButtons: PanelButton[] = [
    { id: "safariZone", label: "Safari", activeColor: "#38b764" },
    { id: "gameCorner", label: "Game", activeColor: "#f7a838" },
    { id: "typeQuiz", label: "Quiz", activeColor: "#4a90d9" },
    { id: "fossilLab", label: "Fossil", activeColor: "#a0522d", badge: fossilCount > 0 ? ` (${fossilCount})` : undefined },
    { id: "pokeMart", label: "Mart", activeColor: "#38b764", badge: money > 0 ? ` (\u00A5${money.toLocaleString()})` : undefined },
    { id: "evTraining", label: "EV Train", activeColor: "#f06292" },
    { id: "moveTutor", label: "Tutor", activeColor: "#4a90d9" },
    { id: "mysteryGift", label: "Gift", activeColor: "#f7a838" },
    { id: "linkCable", label: "Link", activeColor: "#e8433f" },
    { id: "wonderTrade", label: "Trade", activeColor: "#3b82f6" },
    { id: "dayCare", label: "Day Care", activeColor: "#f7a838" },
    { id: "pcBox", label: "PC Box", activeColor: "#38b764", badge: ` (${boxCount})` },
    { id: "berryFarm", label: "Berry", activeColor: "#38b764" },
    { id: "slotMachine", label: "Slots", activeColor: "#f7a838" },
    { id: "eggMoves", label: "Eggs", activeColor: "#f06292" },
  ];

  return (
    <div className="flex items-center gap-2">
      {/* Nuzlocke toggle */}
      <button
        onClick={onToggleNuzlocke}
        className={`px-2 py-1 text-[9px] font-pixel rounded-lg border transition-colors ${
          nuzlockeEnabled
            ? "text-[#e8433f] border-[#e8433f] bg-[#e8433f]/10"
            : "text-[#3a4466] border-[#3a4466] hover:text-[#8b9bb4]"
        }`}
        title="Nuzlocke: One catch per area, permadeath, game over when all faint"
      >
        {nuzlockeEnabled ? "Nuzlocke ON" : "Nuzlocke"}
      </button>
      <span className="text-[9px] text-[#8b9bb4]">
        Lead: {teamLeadName}
      </span>
      {panelButtons.map((btn) => {
        const isActive = activePanel === btn.id;
        // Some buttons have bg tint when active, some don't
        const hasBgTint = [
          "safariZone", "gameCorner", "typeQuiz", "fossilLab", "pokeMart",
          "evTraining", "moveTutor", "berryFarm", "slotMachine", "eggMoves",
        ].includes(btn.id);

        return (
          <button
            key={btn.id}
            onClick={() => onTogglePanel(btn.id)}
            className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
              isActive
                ? `text-[${btn.activeColor}] border-[${btn.activeColor}]${hasBgTint ? ` bg-[${btn.activeColor}]/10` : ""}`
                : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
            }`}
            style={isActive ? { color: btn.activeColor, borderColor: btn.activeColor, backgroundColor: hasBgTint ? `${btn.activeColor}1a` : undefined } : undefined}
          >
            {btn.label}{btn.badge ?? ""}
          </button>
        );
      })}
    </div>
  );
}
