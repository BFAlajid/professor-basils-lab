import { getFeatureFlags, getAnnouncement } from "@/lib/edge-config";

export const runtime = "edge";

export async function GET() {
  try {
    const [features, announcement] = await Promise.all([
      getFeatureFlags(),
      getAnnouncement(),
    ]);

    return Response.json(
      { features, announcement },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch {
    return Response.json(
      { features: {}, announcement: null },
      {
        headers: {
          "Cache-Control": "no-cache",
        },
      }
    );
  }
}
