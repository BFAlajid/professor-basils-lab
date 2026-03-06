"use client";

interface MapTransitionProps {
  active: boolean;
}

export default function MapTransition({ active }: MapTransitionProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none transition-opacity duration-200"
      style={{
        backgroundColor: "#000",
        opacity: active ? 1 : 0,
      }}
      aria-hidden="true"
    />
  );
}
