"use client";

import { useState, useCallback, useRef } from "react";
import {
  exportAllData,
  importAllData,
  clearAllData,
  getStorageUsageSync,
  type StorageUsage,
} from "@/utils/persistence";
import { silentWarn } from "@/utils/silentWarn";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function DataManager() {
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showStatus = useCallback((type: "success" | "error", message: string) => {
    setStatus({ type, message });
    if (statusTimeout.current) clearTimeout(statusTimeout.current);
    statusTimeout.current = setTimeout(() => {
      setStatus({ type: "idle", message: "" });
    }, 4000);
  }, []);

  const refreshUsage = useCallback(() => {
    setUsage(getStorageUsageSync());
  }, []);

  // Export
  const handleExport = useCallback(() => {
    try {
      const json = exportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.download = `pokemon-save-${date}.json`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showStatus("success", "Save data exported");
    } catch (e) {
      silentWarn("DataManager:export", e);
      showStatus("error", "Export failed");
    }
  }, [showStatus]);

  // Import
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = reader.result as string;
          const count = importAllData(json);
          showStatus("success", `Imported ${count} data entries. Reload to apply.`);
          refreshUsage();
        } catch (err) {
          silentWarn("DataManager:import", err);
          const msg = err instanceof Error ? err.message : "Import failed";
          showStatus("error", msg);
        }
      };
      reader.onerror = () => {
        showStatus("error", "Could not read file");
      };
      reader.readAsText(file);

      // Reset file input so re-selecting the same file works
      e.target.value = "";
    },
    [showStatus, refreshUsage],
  );

  // Clear
  const handleClear = useCallback(() => {
    clearAllData();
    setShowConfirmClear(false);
    showStatus("success", "All save data cleared. Reload to apply.");
    refreshUsage();
  }, [showStatus, refreshUsage]);

  return (
    <div className="space-y-3 rounded-lg border border-[#3a4466] bg-[#262b44] p-4">
      <h3 className="text-sm font-pixel text-[#f0f0e8]">Save Data</h3>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-[#3a4466] px-3 py-1.5 text-xs font-pixel text-[#f0f0e8] transition-colors hover:bg-[#4a5577]"
          aria-label="Export save data"
        >
          Export Save Data
        </button>

        <button
          type="button"
          onClick={handleImportClick}
          className="rounded bg-[#3a4466] px-3 py-1.5 text-xs font-pixel text-[#f0f0e8] transition-colors hover:bg-[#4a5577]"
          aria-label="Import save data"
        >
          Import Save Data
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={() => refreshUsage()}
          className="rounded bg-[#3a4466] px-3 py-1.5 text-xs font-pixel text-[#8b9bb4] transition-colors hover:bg-[#4a5577] hover:text-[#f0f0e8]"
          aria-label="Check storage usage"
        >
          Check Usage
        </button>
      </div>

      {/* Usage display */}
      {usage && (
        <div className="text-[10px] font-pixel text-[#8b9bb4]">
          Storage: {formatBytes(usage.used)} / {formatBytes(usage.limit)} ({usage.percent}%)
        </div>
      )}

      {/* Danger zone */}
      <div className="border-t border-[#3a4466] pt-3">
        {!showConfirmClear ? (
          <button
            type="button"
            onClick={() => setShowConfirmClear(true)}
            className="rounded border border-[#e8433f]/40 bg-[#e8433f]/10 px-3 py-1.5 text-xs font-pixel text-[#e8433f] transition-colors hover:bg-[#e8433f]/20"
            aria-label="Clear all save data"
          >
            Clear All Data
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-pixel text-[#e8433f]">
              Delete everything?
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="rounded bg-[#e8433f] px-3 py-1.5 text-xs font-pixel text-[#f0f0e8] transition-colors hover:bg-[#f05050]"
            >
              Yes, clear
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmClear(false)}
              className="rounded bg-[#3a4466] px-3 py-1.5 text-xs font-pixel text-[#f0f0e8] transition-colors hover:bg-[#4a5577]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Status message */}
      {status.type !== "idle" && (
        <div
          className={`text-xs font-pixel ${
            status.type === "success" ? "text-green-400" : "text-[#e8433f]"
          }`}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
