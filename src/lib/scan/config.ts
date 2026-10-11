/** Server-only configuration for Scan-to-Find. */
export const SCAN_CONFIG = {
  maxUploadBytes: 8 * 1024 * 1024,
  maxImagePixels: 40_000_000,
  maxReferenceImagesPerRun: 10,
  resultLimit: 5,
  maxDistance: Number(process.env.SCAN_MAX_DISTANCE ?? "0.28"),
  embeddingDimensions: 512,
  modelVersion: "Xenova/clip-vit-base-patch32",
} as const;
