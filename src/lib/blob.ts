import { put } from "@vercel/blob";
import type { ShareType, StoredShare } from "@/types/share";

/** Upload share data and return the public blob URL. */
export async function uploadShare(
  id: string,
  type: ShareType,
  data: string
): Promise<string> {
  const { url } = await put(`shares/${type}/${id}`, data, {
    access: "public",
    addRandomSuffix: false,
    contentType:
      type === "trainer-card" ? "image/png" : "application/json",
  });
  return url;
}

/** Upload share metadata JSON alongside the data blob. */
export async function uploadShareMeta(
  id: string,
  meta: StoredShare
): Promise<void> {
  await put(`shares/meta/${id}.json`, JSON.stringify(meta), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

