export class ImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageError";
  }
}

export interface InlineImage {
  mimeType: string;
  data: string; // base64
}

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Detect the real type from magic bytes, not from the (spoofable) file extension.
function sniffMime(b: Buffer): string | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length > 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return null;
}

export async function fileToInlineImage(file: File): Promise<InlineImage> {
  if (file.size === 0) throw new ImageError("The uploaded file is empty.");
  if (file.size > MAX_BYTES) throw new ImageError("Screenshot is too large (max 8 MB).");

  const buf = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffMime(buf);
  if (!mimeType) throw new ImageError("Only PNG, JPG or WEBP screenshots are supported.");

  return { mimeType, data: buf.toString("base64") };
}
