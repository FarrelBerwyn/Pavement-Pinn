/**
 * Validation of the report photo reference (execution brief §AS).
 *
 * Accepted: an https/http URL, or a data URL whose decoded bytes really are JPEG, PNG or
 * WebP (magic bytes checked, the declared MIME type is not trusted) and at most 5 MB.
 * The image stays inside the report record in the demo store; production uploads belong
 * in object storage (Supabase Storage, not configured — docs/GAP_REGISTER.md).
 *
 * Not done here: EXIF/GPS metadata stripping (needs an image library; tracked as a gap).
 */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type PhotoCheck = { ok: true; kind: "url" | "jpeg" | "png" | "webp" } | { ok: false; message: string };

function sniff(bytes: Buffer): "jpeg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

export function checkPhotoReference(photoUrl: unknown): PhotoCheck {
  if (typeof photoUrl !== "string" || photoUrl.length === 0) return { ok: false, message: "A photo is required." };
  if (/^https?:\/\//i.test(photoUrl)) {
    if (photoUrl.length > 2048) return { ok: false, message: "Photo URL is too long." };
    return { ok: true, kind: "url" };
  }
  const match = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=\s]+)$/i.exec(photoUrl);
  if (!match) return { ok: false, message: "Photo must be an image URL or a base64 image." };
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length > MAX_PHOTO_BYTES) return { ok: false, message: "Photo is larger than 5 MB." };
  const kind = sniff(bytes);
  if (!kind) return { ok: false, message: "Photo content is not a JPEG, PNG or WebP image." };
  return { ok: true, kind };
}
