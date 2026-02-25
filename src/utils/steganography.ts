const MAGIC = [0x50, 0x42, 0x4c];

const ZW_ZERO = "\u200B";
const ZW_ONE = "\u200C";
const ZW_SEP = "\u200D";

function stringToBits(str: string): number[] {
  const bytes = new TextEncoder().encode(str);
  const bits: number[] = [];
  for (const b of MAGIC) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  bits.push(...byteToBits(bytes.length >> 8));
  bits.push(...byteToBits(bytes.length & 0xff));
  for (const b of bytes) {
    bits.push(...byteToBits(b));
  }
  return bits;
}

function byteToBits(byte: number): number[] {
  const bits: number[] = [];
  for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  return bits;
}

export function embedWatermark(canvas: HTMLCanvasElement): void {
  const deployId = process.env.NEXT_PUBLIC_DEPLOY_ID || "unknown";
  const payload = `${deployId}|${Date.now()}`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const bits = stringToBits(payload);

  const maxBits = Math.floor(data.length / 4);
  const bitsToEmbed = Math.min(bits.length, maxBits);

  for (let i = 0; i < bitsToEmbed; i++) {
    const idx = i * 4 + 2;
    data[idx] = (data[idx] & 0xfe) | bits[i];
  }

  ctx.putImageData(imageData, 0, 0);
}

export function embedTextWatermark(text: string, secret: string): string {
  const bytes = new TextEncoder().encode(secret);
  let encoded = ZW_SEP;
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) {
      encoded += (b >> i) & 1 ? ZW_ONE : ZW_ZERO;
    }
  }
  encoded += ZW_SEP;

  const mid = Math.floor(text.length / 2);
  return text.slice(0, mid) + encoded + text.slice(mid);
}

export function extractTextWatermark(text: string): string | null {
  const startIdx = text.indexOf(ZW_SEP);
  if (startIdx === -1) return null;
  const endIdx = text.indexOf(ZW_SEP, startIdx + 1);
  if (endIdx === -1) return null;

  const zwChars = text.slice(startIdx + 1, endIdx);
  const bits: number[] = [];
  for (const ch of zwChars) {
    if (ch === ZW_ZERO) bits.push(0);
    else if (ch === ZW_ONE) bits.push(1);
  }

  if (bits.length % 8 !== 0) return null;

  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    bytes.push(byte);
  }

  return new TextDecoder().decode(new Uint8Array(bytes));
}
