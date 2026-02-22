interface SkeletonLoaderProps {
  lines?: number;
  label?: string;
}

export default function SkeletonLoader({ lines = 3, label = "Loading..." }: SkeletonLoaderProps) {
  return (
    <div className="animate-pulse space-y-3 py-8">
      <p className="text-[#8b9bb4] font-pixel text-xs text-center">{label}</p>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-[#3a4466] rounded w-full" />
      ))}
    </div>
  );
}
