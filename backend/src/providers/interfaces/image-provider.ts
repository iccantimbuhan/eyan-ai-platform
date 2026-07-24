export type ImageFormat = "png" | "jpg" | "webp";

export interface GenerateImageRequest {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  format: ImageFormat;
}

export interface GenerateImageResponse {
  buffer: Buffer;
  model: string;
  width: number;
  height: number;
  format: ImageFormat;
}

export interface ImageProvider {
  readonly name: string;

  generate(request: GenerateImageRequest): Promise<GenerateImageResponse>;
}
