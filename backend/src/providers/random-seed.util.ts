// Shared by any ImageProvider that accepts a generation seed but has no
// per-request seed field to read one from — GenerateImageRequest (the
// shared, provider-agnostic contract) deliberately has no seed field, since
// it's not something every provider supports. Used by ComfyUIProvider and
// HuggingFaceProvider; extracted here once both needed the exact same
// one-line implementation.
export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}
