export interface AiModelResponseDto {
  id: string;
  providerId: string;
  modelKey: string;
  displayName: string;
  tags: string[];
  contextWindow: number | null;
  costPerInputToken: string | null;
  costPerOutputToken: string | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
