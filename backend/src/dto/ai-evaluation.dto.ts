export interface AiEvaluationResponseDto {
  id: string;
  promptId: string;
  testCaseName: string;
  input: Record<string, unknown>;
  expectedShape: Record<string, unknown> | null;
  actualOutput: Record<string, unknown> | null;
  passed: boolean;
  score: number | null;
  evaluatedAt: Date;
}
