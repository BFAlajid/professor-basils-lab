export type ShareType = "trainer-card" | "replay" | "challenge";

export interface SharePayload {
  type: ShareType;
  data: string; // base64 for images, JSON string for replays/challenges
  metadata: {
    title: string;
    createdAt: string; // ISO 8601
    trainerName?: string;
    pokemonNames?: string[];
  };
}

export interface ShareResponse {
  id: string; // 12-char hex slug
  url: string; // /share/{id}
  expiresAt: string; // ISO 8601
}

export interface StoredShare {
  type: ShareType;
  blobUrl: string;
  metadata: SharePayload["metadata"];
  expiresAt: string;
}
