"use client";

import { useRef } from "react";
import { useAudio } from "@/hooks/useAudio";
import { AudioTrack } from "@/utils/audioManager";

const TRACK_LABELS: Record<AudioTrack, string> = {
  teamBuilder: "Team",
  battle: "Battle",
  victory: "Victory",
  defeat: "Defeat",
  encounter: "Wild",
  map: "Map",
  gymLeader: "Gym",
  champion: "Champ",
  surf: "Surf",
  pokemonCenter: "PC",
  catchSuccess: "Catch",
};

export default function AudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    play,
    stop,
    pause,
    resume,
    setVolume,
    setMuted,
    loadCustomTrack,
  } = useAudio();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTrackRef = useRef<AudioTrack>("teamBuilder");

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else if (currentTrack) {
      resume();
    } else {
      play("teamBuilder");
    }
  };

  const handleUpload = (track: AudioTrack) => {
    uploadTrackRef.current = track;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadCustomTrack(uploadTrackRef.current, file);
    }
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#262b44] border border-[#3a4466] px-3 py-1.5">
      {/* Track label */}
      <span className="text-[10px] text-[#8b9bb4] font-pixel min-w-[40px]">
        {currentTrack ? TRACK_LABELS[currentTrack] : "BGM"}
      </span>

      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        className="text-[#f0f0e8] hover:text-[#38b764] transition-colors text-sm px-1"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "||" : "▶"}
      </button>

      {/* Stop */}
      <button
        onClick={stop}
        className="text-[#f0f0e8] hover:text-[#e8433f] transition-colors text-sm px-1"
        title="Stop"
      >
        ■
      </button>

      {/* Volume slider */}
      <input
        type="range"
        min="0"
        max="100"
        value={isMuted ? 0 : Math.round(volume * 100)}
        onChange={(e) => {
          const v = parseInt(e.target.value) / 100;
          setVolume(v);
          if (isMuted && v > 0) setMuted(false);
        }}
        className="w-16 h-1 accent-[#38b764] cursor-pointer"
        title={`Volume: ${Math.round(volume * 100)}%`}
      />

      {/* Mute toggle */}
      <button
        onClick={() => setMuted(!isMuted)}
        className={`text-xs px-1 transition-colors ${isMuted ? "text-[#e8433f]" : "text-[#8b9bb4] hover:text-[#f0f0e8]"}`}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? "🔇" : "🔊"}
      </button>

      {/* Upload dropdown */}
      <div className="relative group">
        <button
          className="text-[10px] text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors px-1"
          title="Upload custom music"
        >
          ♪+
        </button>
        <div className="absolute right-0 top-full mt-1 bg-[#262b44] border border-[#3a4466] rounded-lg py-1 hidden group-hover:block z-50 min-w-[100px]">
          {(Object.keys(TRACK_LABELS) as AudioTrack[]).map((track) => (
            <button
              key={track}
              onClick={() => handleUpload(track)}
              className="block w-full text-left px-3 py-1 text-[10px] text-[#8b9bb4] hover:text-[#f0f0e8] hover:bg-[#3a4466] transition-colors"
            >
              {TRACK_LABELS[track]}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
