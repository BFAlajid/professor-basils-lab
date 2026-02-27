"use client";

import { motion } from "framer-motion";
import { TeamSlot, BallType, PCBoxPokemon, Pokemon } from "@/types";
import type { WildPanel } from "./WildToolbar";
import PCBox from "./PCBox";
import DayCare from "./DayCare";
import WonderTrade from "./WonderTrade";
import MysteryGift from "./MysteryGift";
import LinkCable from "./LinkCable";
import LinkTrade from "./LinkTrade";
import SafariZone from "./SafariZone";
import VoltorbFlip from "./VoltorbFlip";
import TypeQuiz from "./TypeQuiz";
import FossilLab from "./FossilLab";
import PokeMart from "./PokeMart";
import EVTraining from "./EVTraining";
import MoveTutor from "./MoveTutor";
import BerryFarm from "./BerryFarm";
import SlotMachine from "./SlotMachine";
import EggMoveCalculator from "./EggMoveCalculator";

interface WildPanelRouterProps {
  activePanel: WildPanel;
  // PC Box
  box: PCBoxPokemon[];
  teamSize: number;
  onMoveToTeam: (index: number) => void;
  onRemoveFromBox: (index: number) => void;
  onSetNickname: (index: number, nickname: string) => void;
  onAddToBox: (p: PCBoxPokemon) => void;
  // Wonder Trade / Mystery Gift
  onTradeComplete: () => void;
  onGiftClaimed: () => void;
  // Link Cable / Trade
  linkView: "cable" | "trade";
  /* eslint-disable @typescript-eslint/no-explicit-any */
  online: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  onLinkBattle: () => void;
  onLinkTrade: () => void;
  onLinkBack: () => void;
  onTradeSwitchToCable: () => void;
  // Safari Zone
  /* eslint-disable @typescript-eslint/no-explicit-any */
  safari: {
    state: any;
    isSearching: boolean;
    enterSafari: (region: string) => void;
    search: () => Promise<void>;
    throwBall: () => void;
    throwRock: () => void;
    throwBait: () => void;
    run: () => void;
    continueAfterResult: () => void;
    exitSafari: () => void;
    reset: () => void;
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  onSafariAddAll: (entries: { pokemon: Pokemon; level: number; isShiny: boolean }[]) => void;
  onSafariTrip: () => void;
  onSafariClose: () => void;
  // Game Corner
  onGameCornerPurchase: (pokemonId: number, level: number, area: string) => Promise<void>;
  onCoinsEarned: (amount: number) => void;
  // Type Quiz
  stats: { money: number; quizBestScore?: number };
  onQuizScore: (score: number) => void;
  // Fossil Lab
  fossilInventory: Record<string, number>;
  onReviveFossil: (fossilId: string) => Promise<void>;
  onFossilClose: () => void;
  // PokeMart
  ballInventory: Record<string, number>;
  battleItemInventory: Record<string, number>;
  ownedItems: Record<string, number>;
  onPokeMartBuy: (item: { id: string; price: number; category: string; ballType?: BallType }, quantity: number) => boolean;
  // EV Training
  team: TeamSlot[];
  onUpdateEvs: (position: number, evs: import("@/types").EVSpread) => void;
  onEvSession: () => void;
  // Move Tutor
  onTeachMove: (position: number, moveName: string) => void;
  onSpendHeartScale: () => boolean;
}

export default function WildPanelRouter(props: WildPanelRouterProps) {
  const { activePanel } = props;
  if (!activePanel) return null;

  return (
    <motion.div
      key={activePanel}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      {activePanel === "pcBox" && (
        <PCBox
          box={props.box}
          teamSize={props.teamSize}
          onMoveToTeam={props.onMoveToTeam}
          onRemove={props.onRemoveFromBox}
          onSetNickname={props.onSetNickname}
        />
      )}
      {activePanel === "dayCare" && <DayCare box={props.box} />}
      {activePanel === "wonderTrade" && (
        <WonderTrade
          box={props.box}
          onRemoveFromBox={props.onRemoveFromBox}
          onAddToBox={props.onAddToBox}
          onTradeComplete={props.onTradeComplete}
        />
      )}
      {activePanel === "mysteryGift" && (
        <MysteryGift
          onAddToBox={props.onAddToBox}
          onGiftClaimed={props.onGiftClaimed}
        />
      )}
      {activePanel === "linkCable" && (
        props.linkView === "cable" ? (
          <LinkCable
            online={{
              state: props.online.state,
              createLobby: props.online.createLobby,
              joinLobby: props.online.joinLobby,
              setLinkMode: props.online.setLinkMode,
              disconnect: props.online.disconnect,
            }}
            onBattle={props.onLinkBattle}
            onTrade={props.onLinkTrade}
            onBack={props.onLinkBack}
          />
        ) : (
          <LinkTrade
            myBox={props.box}
            trade={props.online.state.trade}
            isHost={props.online.state.isHost}
            onShareBox={props.online.shareMyBox}
            onOfferPokemon={props.online.sendTradeOffer}
            onConfirm={props.online.confirmTrade}
            onReject={props.online.rejectTrade}
            onComplete={(sentPokemon) => props.online.completeTrade(sentPokemon)}
            onReset={props.online.resetTrade}
            onAddToBox={props.onAddToBox}
            onRemoveFromBox={props.onRemoveFromBox}
            onBack={props.onTradeSwitchToCable}
          />
        )
      )}
      {activePanel === "safariZone" && (
        <SafariZone
          state={props.safari.state}
          isSearching={props.safari.isSearching}
          onEnter={props.safari.enterSafari}
          onSearch={props.safari.search}
          onThrowBall={props.safari.throwBall}
          onThrowRock={props.safari.throwRock}
          onThrowBait={props.safari.throwBait}
          onRun={props.safari.run}
          onContinue={props.safari.continueAfterResult}
          onExit={props.safari.exitSafari}
          onReset={() => {
            props.onSafariTrip();
            props.safari.reset();
          }}
          onAddAllToBox={props.onSafariAddAll}
          onClose={props.onSafariClose}
        />
      )}
      {activePanel === "gameCorner" && (
        <VoltorbFlip
          onAddToBox={props.onGameCornerPurchase}
          onCoinsEarned={props.onCoinsEarned}
        />
      )}
      {activePanel === "typeQuiz" && (
        <TypeQuiz onScoreUpdate={props.onQuizScore} />
      )}
      {activePanel === "fossilLab" && (
        <FossilLab
          fossilInventory={props.fossilInventory}
          onRevive={props.onReviveFossil}
          onClose={props.onFossilClose}
        />
      )}
      {activePanel === "pokeMart" && (
        <PokeMart
          money={props.stats.money}
          onBuy={props.onPokeMartBuy}
          ballInventory={props.ballInventory}
          battleItemInventory={props.battleItemInventory}
          ownedItems={props.ownedItems}
        />
      )}
      {activePanel === "evTraining" && (
        <EVTraining
          team={props.team}
          ownedItems={props.ownedItems}
          onUpdateEvs={props.onUpdateEvs}
          onSessionComplete={props.onEvSession}
        />
      )}
      {activePanel === "moveTutor" && (
        <MoveTutor
          team={props.team}
          heartScales={props.ownedItems["heart-scale"] ?? 0}
          onTeachMove={props.onTeachMove}
          onSpendHeartScale={props.onSpendHeartScale}
        />
      )}
      {activePanel === "berryFarm" && <BerryFarm />}
      {activePanel === "slotMachine" && <SlotMachine />}
      {activePanel === "eggMoves" && <EggMoveCalculator />}
    </motion.div>
  );
}
