import type { Request, Response } from "express";

import { FinanceExpenseService } from "../services/finance-expense.service.js";
import { ApiResponse } from "../utils/api-response.js";

const financeExpenseService = new FinanceExpenseService();

export class FinanceExpenseController {
  private static getId(req: Request): string {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
  }

  static async list(req: Request, res: Response) {
    const result = await financeExpenseService.list({
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      category: req.query.category as never,
      dateFrom: req.query.dateFrom?.toString(),
      dateTo: req.query.dateTo?.toString(),
      search: req.query.search?.toString(),
      sortBy: req.query.sortBy as never,
      sortDir: req.query.sortDir as never,
    });

    return ApiResponse.paginated(
      res,
      result.items,
      result.pagination,
      200,
      "Expenses retrieved successfully."
    );
  }

  static async getOne(req: Request, res: Response) {
    const expense = await financeExpenseService.getById(FinanceExpenseController.getId(req));

    return ApiResponse.success(res, expense, 200, "Expense retrieved successfully.");
  }

  static async create(req: Request, res: Response) {
    const expense = await financeExpenseService.create(req.body, req.user.id);

    return ApiResponse.success(res, expense, 201, "Expense created successfully.");
  }

  static async update(req: Request, res: Response) {
    const expense = await financeExpenseService.update(
      FinanceExpenseController.getId(req),
      req.body,
      req.user.id
    );

    return ApiResponse.success(res, expense, 200, "Expense updated successfully.");
  }

  static async remove(req: Request, res: Response) {
    await financeExpenseService.delete(FinanceExpenseController.getId(req), req.user.id);

    return ApiResponse.success(res, null, 200, "Expense deleted successfully.");
  }
}
