import type { Metadata } from "next";
import type { StoredShare } from "@/types/share";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://pokemon-team-builder.vercel.app";

async function fetchShare(id: string): Promise<StoredShare | null> {
  const res = await fetch(`${APP_URL}/api/share/${id}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  return (await res.json()) as StoredShare;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const share = await fetchShare(id);

  if (!share) {
    return { title: "Share Not Found - Pokemon Team Builder" };
  }

  const title = share.metadata.title;
  const description = share.metadata.pokemonNames
    ? `Team: ${share.metadata.pokemonNames.join(", ")}`
    : `Shared ${share.type} from Pokemon Team Builder`;

  const hasValidImage =
    share.type === "trainer-card" && isBlobUrlSafe(share.blobUrl);

  return {
    title: `${title} - Pokemon Team Builder`,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(hasValidImage && {
        images: [share.blobUrl],
      }),
    },
    twitter: {
      card: hasValidImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(hasValidImage && {
        images: [share.blobUrl],
      }),
    },
  };
}

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen bg-[#1a1c2c] flex items-center justify-center p-4">
      <div className="border-2 border-[#3a4466] bg-[#262b44] rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-[#f0f0e8] font-[family-name:var(--font-pixel)] text-lg mb-4">
          {title}
        </h1>
        <p className="text-[#f0f0e8]/70 font-[family-name:var(--font-pixel-body)] text-sm">
          {message}
        </p>
        <a
          href="/"
          className="mt-6 inline-block border-2 border-[#3a4466] bg-[#1a1c2c] text-[#f0f0e8] font-[family-name:var(--font-pixel)] text-xs px-4 py-2 rounded hover:bg-[#3a4466] transition-colors"
        >
          Back to App
        </a>
      </div>
    </main>
  );
}

const BLOB_HOST = "public.blob.vercel-storage.com";

function isBlobUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === BLOB_HOST && parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function TrainerCardView({ share }: { share: StoredShare }) {
  const safeUrl = isBlobUrlSafe(share.blobUrl);

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-[#f0f0e8] font-[family-name:var(--font-pixel)] text-sm">
        {share.metadata.title}
      </h1>
      {share.metadata.trainerName && (
        <p className="text-[#f0f0e8]/70 font-[family-name:var(--font-pixel-body)] text-sm">
          Trainer: {share.metadata.trainerName}
        </p>
      )}
      {safeUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={share.blobUrl}
          alt={`Trainer Card: ${share.metadata.title}`}
          className="border-2 border-[#3a4466] rounded-lg max-w-full"
        />
      ) : (
        <p className="text-red-400 font-[family-name:var(--font-pixel-body)] text-sm">
          Image unavailable — invalid source.
        </p>
      )}
    </div>
  );
}

function ReplayView({ share, id }: { share: StoredShare; id: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-[#f0f0e8] font-[family-name:var(--font-pixel)] text-sm">
        {share.metadata.title}
      </h1>
      {share.metadata.pokemonNames && share.metadata.pokemonNames.length > 0 && (
        <p className="text-[#f0f0e8]/70 font-[family-name:var(--font-pixel-body)] text-sm">
          Pokemon: {share.metadata.pokemonNames.join(", ")}
        </p>
      )}
      <a
        href={`/?tab=battle&replay=${id}`}
        className="border-2 border-[#3a4466] bg-[#1a1c2c] text-[#f0f0e8] font-[family-name:var(--font-pixel)] text-xs px-6 py-3 rounded hover:bg-[#3a4466] transition-colors"
      >
        View in App
      </a>
    </div>
  );
}

function ChallengeView({ share, id }: { share: StoredShare; id: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-[#f0f0e8] font-[family-name:var(--font-pixel)] text-sm">
        {share.metadata.title}
      </h1>
      {share.metadata.trainerName && (
        <p className="text-[#f0f0e8]/70 font-[family-name:var(--font-pixel-body)] text-sm">
          Challenger: {share.metadata.trainerName}
        </p>
      )}
      {share.metadata.pokemonNames && share.metadata.pokemonNames.length > 0 && (
        <p className="text-[#f0f0e8]/70 font-[family-name:var(--font-pixel-body)] text-sm">
          Team: {share.metadata.pokemonNames.join(", ")}
        </p>
      )}
      <a
        href={`/?tab=battle&challenge=${id}`}
        className="border-2 border-[#3a4466] bg-[#1a1c2c] text-[#f0f0e8] font-[family-name:var(--font-pixel)] text-xs px-6 py-3 rounded hover:bg-[#3a4466] transition-colors"
      >
        Accept Challenge
      </a>
    </div>
  );
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await fetchShare(id);

  if (!share) {
    return (
      <ErrorPanel
        title="Not Found"
        message="This share link does not exist or has expired."
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#1a1c2c] flex items-center justify-center p-4">
      <div className="border-2 border-[#3a4466] bg-[#262b44] rounded-lg p-8 max-w-lg w-full">
        {share.type === "trainer-card" && <TrainerCardView share={share} />}
        {share.type === "replay" && <ReplayView share={share} id={id} />}
        {share.type === "challenge" && <ChallengeView share={share} id={id} />}

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-[#f0f0e8]/50 font-[family-name:var(--font-pixel)] text-[10px] hover:text-[#f0f0e8]/70 transition-colors"
          >
            Pokemon Team Builder
          </a>
        </div>
      </div>
    </main>
  );
}
