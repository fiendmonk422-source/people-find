import "server-only";
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from "@huggingface/transformers";
import sharp from "sharp";
import { SCAN_CONFIG } from "./config";

const MODEL_ID = SCAN_CONFIG.modelVersion;
type LoadedModel = { processor: any; model: any };
let modelPromise: Promise<LoadedModel> | undefined;

async function getModel(): Promise<LoadedModel> {
  if (!modelPromise) {
    modelPromise = Promise.all([
      AutoProcessor.from_pretrained(MODEL_ID),
      CLIPVisionModelWithProjection.from_pretrained(MODEL_ID),
    ]).then(([processor, model]) => ({ processor, model }))
      .catch((error) => {
        modelPromise = undefined;
        throw error;
      });
  }
  return modelPromise;
}

/**
 * Produce the normalized 512D CLIP image projection.
 * Query and catalog images must use this exact model and preprocessing path.
 * This is visual similarity, not face recognition or identity verification.
 */
export async function imageToEmbedding(input: Buffer): Promise<number[]> {
  if (!input.length || input.length > SCAN_CONFIG.maxUploadBytes) {
    throw new Error("image_too_large_or_empty");
  }

  let normalizedImage: Buffer;
  try {
    const pipeline = sharp(input, { limitInputPixels: SCAN_CONFIG.maxImagePixels });
    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height ||
        metadata.width * metadata.height > SCAN_CONFIG.maxImagePixels) {
      throw new Error("unsupported_image");
    }

    // Decode the image, apply EXIF orientation and re-encode consistently.
    normalizedImage = await sharp(input, { limitInputPixels: SCAN_CONFIG.maxImagePixels })
      .rotate()
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch {
    throw new Error("unsupported_or_corrupt_image");
  }

  const image = await RawImage.fromBlob(
    new Blob([new Uint8Array(normalizedImage)], { type: "image/jpeg" }),
  );
  const { processor, model } = await getModel();
  const inputs = await processor(image);
  const output = await model(inputs);
  const tensor = output.image_embeds;
  if (!tensor) throw new Error("clip_image_embedding_missing");

  const rows = tensor.tolist() as number[][] | number[];
  const raw = Array.isArray(rows[0]) ? rows[0] as number[] : rows as number[];
  if (raw.length !== SCAN_CONFIG.embeddingDimensions ||
      raw.some((value) => !Number.isFinite(value))) {
    throw new Error(`unexpected_embedding_dimensions:${raw.length}`);
  }

  const norm = Math.sqrt(raw.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(norm) || norm < 1e-12) throw new Error("invalid_image_embedding");
  return raw.map((value) => value / norm);
}
