"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot } from "@/types";
import { exportToShowdown } from "@/utils/showdownFormatWasm";

interface QRExportProps {
  team: TeamSlot[];
  isOpen: boolean;
  onClose: () => void;
}

export default function QRExport({ team, isOpen, onClose }: QRExportProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const showdownText = team.length > 0 ? exportToShowdown(team) : "";

  const generateQR = useCallback(() => {
    if (!showdownText) {
      setError("No team data to export.");
      return;
    }
    setLoading(true);
    setError(null);
    setQrUrl(null);

    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(showdownText)}`;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setQrUrl(apiUrl);
      setLoading(false);
    };
    img.onerror = () => {
      setError("Failed to generate QR code. Check your connection.");
      setLoading(false);
    };
    img.src = apiUrl;
  }, [showdownText]);

  useEffect(() => {
    if (isOpen) {
      generateQR();
      setCopied(false);
    } else {
      setQrUrl(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, generateQR]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(showdownText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked in some contexts */
    }
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = "pokemon-team-qr.png";
    link.click();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(26,28,44,0.80)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            className="relative w-[360px] max-w-[95vw] rounded-lg border-2 p-6"
            style={{
              backgroundColor: "#262b44",
              borderColor: "#3a4466",
              color: "#f0f0e8",
              fontFamily: "var(--font-pixel, monospace)",
            }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: "#f0f0e8" }}>
                Team QR Code
              </h2>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded transition-colors"
                style={{ backgroundColor: "#3a4466", color: "#f0f0e8" }}
                aria-label="Close"
              >
                X
              </button>
            </div>

            {/* QR display area */}
            <div
              className="mx-auto mb-4 flex h-[300px] w-[300px] items-center justify-center rounded"
              style={{ backgroundColor: "#1a1c2c" }}
            >
              {loading && (
                <span className="animate-pulse text-sm" style={{ color: "#f0f0e8" }}>
                  Generating...
                </span>
              )}
              {error && (
                <span className="px-4 text-center text-sm" style={{ color: "#e05050" }}>
                  {error}
                </span>
              )}
              {qrUrl && !loading && !error && (
                <img
                  src={qrUrl}
                  alt="Team QR Code"
                  width={300}
                  height={300}
                  className="rounded"
                />
              )}
            </div>

            {/* Caption */}
            <p
              className="mb-4 text-center text-xs"
              style={{ color: "#a0a0b8" }}
            >
              Scan to import this team
            </p>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 rounded border px-3 py-2 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: copied ? "#2a6040" : "#3a4466",
                  borderColor: "#3a4466",
                  color: "#f0f0e8",
                }}
              >
                {copied ? "Copied!" : "Copy Showdown"}
              </button>
              <button
                onClick={handleDownload}
                disabled={!qrUrl}
                className="flex-1 rounded border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: "#3a4466",
                  borderColor: "#3a4466",
                  color: "#f0f0e8",
                }}
              >
                Download QR
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
