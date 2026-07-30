export interface SetBudgetDto {
  period: string;
  monthlyLimit: string;
}

export interface BudgetResponseDto {
  id: string;
  period: string;
  monthlyLimit: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
