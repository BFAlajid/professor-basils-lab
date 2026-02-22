"use client";

export default function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-[#3a4466] border-t-[#e8433f]"
      style={{ width: size, height: size }}
    />
  );
}
