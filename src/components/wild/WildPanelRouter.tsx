"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useWildInventoryContext, useWildUIContext } from "@/contexts/WildTabContext";
import { createPCBoxPokemon } from "@/utils/pokemonFactory";
import type { Pokemon } from "@/types";
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

export default function WildPanelRouter() {
  const {
    box, handleMoveToTeam, removeFromBox, setNickname, addToBox,
    incrementStat, markCaught, addUniqueBall, addUniqueType, addKantoSpecies,
    handleGameCornerPurchase, stats, fossilInventory, handleReviveFossil,
    ballInventory, battleItemInventory, ownedItems, setOwnedItems, handlePokeMartBuy,
  } = useWildInventoryContext();

  const {
    activePanel, setActivePanel, linkView, setLinkView,
    online, safari, team, onSetEvs, onSetMoves,
  } = useWildUIContext();

  if (!activePanel) return null;

  const onSafariAddAll = useCallback((entries: { pokemon: Pokemon; level: number; isShiny: boolean }[]) => {
    entries.forEach((entry) => {
      const pcPokemon = createPCBoxPokemon({
        pokemon: entry.pokemon,
        caughtInArea: `Safari Zone (${safari.state.region})`,
        level: entry.level,
        isShiny: entry.isShiny,
      });
      addToBox(pcPokemon);
      markCaught(entry.pokemon.id, entry.pokemon.name, "safari");
      incrementStat("totalCaught");
      incrementStat("safariPokemonCaught");
      if (entry.isShiny) incrementStat("shinyCaught");
      entry.pokemon.types.forEach((t: { type: { name: string } }) => addUniqueType(t.type.name));
      if (entry.pokemon.id <= 151) addKantoSpecies(entry.pokemon.id);
    });
    incrementStat("safariTripsCompleted");
  }, [safari.state.region, addToBox, markCaught, incrementStat, addUniqueType, addKantoSpecies]);

  const onSafariTrip = useCallback(() => {
    if (safari.state.caughtPokemon.length > 0) incrementStat("safariTripsCompleted");
  }, [safari.state.caughtPokemon.length, incrementStat]);

  const onSafariClose = useCallback(() => {
    if (safari.state.phase !== "entrance") safari.reset();
    setActivePanel(null);
  }, [safari, setActivePanel]);

  const onQuizScore = useCallback((score: number) => {
    if (score > (stats.quizBestScore ?? 0)) incrementStat("quizBestScore", score - (stats.quizBestScore ?? 0));
  }, [stats.quizBestScore, incrementStat]);

  const onTeachMove = useCallback((position: number, moveName: string) => {
    const slot = team[position];
    if (!slot) return;
    const moves = slot.selectedMoves ?? [];
    if (moves.length >= 4) return;
    onSetMoves?.(position, [...moves, moveName]);
  }, [team, onSetMoves]);

  const onSpendHeartScale = useCallback(() => {
    if ((ownedItems["heart-scale"] ?? 0) <= 0) return false;
    setOwnedItems((prev) => ({ ...prev, "heart-scale": (prev["heart-scale"] ?? 0) - 1 }));
    incrementStat("heartScalesUsed");
    return true;
  }, [ownedItems, setOwnedItems, incrementStat]);

  return (
    <motion.div
      key={activePanel}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      {activePanel === "pcBox" && (
        <PCBox
          box={box}
          teamSize={team.length}
          onMoveToTeam={handleMoveToTeam}
          onRemove={removeFromBox}
          onSetNickname={setNickname}
        />
      )}
      {activePanel === "dayCare" && <DayCare box={box} />}
      {activePanel === "wonderTrade" && (
        <WonderTrade
          box={box}
          onRemoveFromBox={removeFromBox}
          onAddToBox={addToBox}
          onTradeComplete={() => incrementStat("wonderTradesCompleted")}
        />
      )}
      {activePanel === "mysteryGift" && (
        <MysteryGift
          onAddToBox={addToBox}
          onGiftClaimed={() => incrementStat("mysteryGiftsClaimed")}
        />
      )}
      {activePanel === "linkCable" && (
        linkView === "cable" ? (
          <LinkCable
            online={{
              state: online.state,
              createLobby: online.createLobby,
              joinLobby: online.joinLobby,
              setLinkMode: online.setLinkMode,
              disconnect: online.disconnect,
            }}
            onBattle={() => setActivePanel(null)}
            onTrade={() => setLinkView("trade")}
            onBack={() => { online.disconnect(); setActivePanel(null); }}
          />
        ) : (
          <LinkTrade
            myBox={box}
            trade={online.state.trade}
            isHost={online.state.isHost}
            onShareBox={online.shareMyBox}
            onOfferPokemon={online.sendTradeOffer}
            onConfirm={online.confirmTrade}
            onReject={online.rejectTrade}
            onComplete={(sentPokemon) => online.completeTrade(sentPokemon)}
            onReset={online.resetTrade}
            onAddToBox={addToBox}
            onRemoveFromBox={removeFromBox}
            onBack={() => setLinkView("cable")}
          />
        )
      )}
      {activePanel === "safariZone" && (
        <SafariZone
          state={safari.state}
          isSearching={safari.isSearching}
          onEnter={safari.enterSafari}
          onSearch={safari.search}
          onThrowBall={safari.throwBall}
          onThrowRock={safari.throwRock}
          onThrowBait={safari.throwBait}
          onRun={safari.run}
          onContinue={safari.continueAfterResult}
          onExit={safari.exitSafari}
          onReset={() => {
            onSafariTrip();
            safari.reset();
          }}
          onAddAllToBox={onSafariAddAll}
          onClose={onSafariClose}
        />
      )}
      {activePanel === "gameCorner" && (
        <VoltorbFlip
          onAddToBox={handleGameCornerPurchase}
          onCoinsEarned={(amount) => incrementStat("gameCornerCoinsEarned", amount)}
        />
      )}
      {activePanel === "typeQuiz" && (
        <TypeQuiz onScoreUpdate={onQuizScore} />
      )}
      {activePanel === "fossilLab" && (
        <FossilLab
          fossilInventory={fossilInventory}
          onRevive={handleReviveFossil}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === "pokeMart" && (
        <PokeMart
          money={stats.money}
          onBuy={handlePokeMartBuy}
          ballInventory={ballInventory}
          battleItemInventory={battleItemInventory}
          ownedItems={ownedItems}
        />
      )}
      {activePanel === "evTraining" && (
        <EVTraining
          team={team}
          ownedItems={ownedItems}
          onUpdateEvs={(position, evs) => onSetEvs?.(position, evs)}
          onSessionComplete={() => incrementStat("evTrainingSessions")}
        />
      )}
      {activePanel === "moveTutor" && (
        <MoveTutor
          team={team}
          heartScales={ownedItems["heart-scale"] ?? 0}
          onTeachMove={onTeachMove}
          onSpendHeartScale={onSpendHeartScale}
        />
      )}
      {activePanel === "berryFarm" && <BerryFarm />}
      {activePanel === "slotMachine" && <SlotMachine />}
      {activePanel === "eggMoves" && <EggMoveCalculator />}
    </motion.div>
  );
}
