"use client";

interface WelcomeCardProps {
  onGetStarted: () => void;
}

const steps = [
  { num: "1", label: "Add Pokemon", icon: "+" },
  { num: "2", label: "Configure moves & stats", icon: "\u2699" },
  { num: "3", label: "Analyze type coverage", icon: "\u25C6" },
  { num: "4", label: "Battle & explore!", icon: "\u2694" },
];

export default function WelcomeCard({ onGetStarted }: WelcomeCardProps) {
  return (
    <div className="gba-card p-4 col-span-full" role="region" aria-label="Welcome guide">
      {/* Title */}
      <p className="font-pixel text-[#f0f0e8] text-xs leading-relaxed mb-3">
        Welcome to Professor Basil&apos;s Lab!{" "}
        <span className="text-[#a0b4cc]">
          Build your Pokemon team, analyze type coverage, and battle!
        </span>
      </p>

      {/* Step flow */}
      <div className="flex items-center gap-1 sm:gap-2 mb-4 overflow-x-auto">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 rounded bg-[#1a1c2c] border border-[#3a4466] px-2 py-1.5">
              <span className="text-[#e8433f] font-pixel text-[10px]">{step.icon}</span>
              <span className="font-pixel text-[#f0f0e8] text-[10px] whitespace-nowrap">
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="text-[#3a4466] font-pixel text-[10px] flex-shrink-0" aria-hidden="true">
                {"\u25B6"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Get Started button */}
      <button
        onClick={onGetStarted}
        className="px-4 py-2 rounded bg-[#e8433f] text-[#f0f0e8] font-pixel text-xs hover:bg-[#f05050] transition-colors focus-visible:ring-2 focus-visible:ring-[#f0f0e8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#262b44]"
      >
        Get Started
      </button>
    </div>
  );
}
