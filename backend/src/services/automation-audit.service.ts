import {
  automationAuditEventRepository,
  AutomationAuditEventRepository,
  type PaginationOptions,
} from "../repositories/automation-audit-event.repository.js";
import type { AutomationAuditAction } from "../generated/prisma/enums.js";
import type { AutomationAuditEvent } from "../generated/prisma/client.js";

export interface RecordAuditEventInput {
  actorId: string;
  action: AutomationAuditAction;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown> | null;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// The standardized entry point every other MCP Foundation service calls to
// write an audit row — ConnectionManager, McpHealthService, and (once real
// providers exist) every McpConnector-driven action all go through
// record() rather than importing AutomationAuditEventRepository directly.
// This keeps "what counts as a valid audit event" a single decision point.
export class AutomationAuditService {
  constructor(
    private readonly repository: AutomationAuditEventRepository = automationAuditEventRepository
  ) {}

  async record(input: RecordAuditEventInput): Promise<AutomationAuditEvent> {
    return this.repository.create(input);
  }

  async listByConnection(
    connectionId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<PagedResult<AutomationAuditEvent>> {
    return this.paginatedQuery(
      (options) => this.repository.findByConnection(connectionId, options),
      () =>
        this.repository.countByTarget("AutomationConnection", connectionId),
      page,
      pageSize
    );
  }

  async listByTarget(
    targetType: string,
    targetId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<PagedResult<AutomationAuditEvent>> {
    return this.paginatedQuery(
      (options) => this.repository.findByTarget(targetType, targetId, options),
      () => this.repository.countByTarget(targetType, targetId),
      page,
      pageSize
    );
  }

  async listByUser(
    userId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<PagedResult<AutomationAuditEvent>> {
    return this.paginatedQuery(
      (options) => this.repository.findByUser(userId, options),
      () => this.repository.countByUser(userId),
      page,
      pageSize
    );
  }

  async listRecent(
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<PagedResult<AutomationAuditEvent>> {
    return this.paginatedQuery(
      (options) => this.repository.findRecent(options),
      () => this.repository.count(),
      page,
      pageSize
    );
  }

  private async paginatedQuery(
    findMany: (options: PaginationOptions) => Promise<AutomationAuditEvent[]>,
    countTotal: () => Promise<number>,
    page: number,
    pageSize: number
  ): Promise<PagedResult<AutomationAuditEvent>> {
    const { safePage, safePageSize, skip, take } = this.paginate(
      page,
      pageSize
    );

    const [data, total] = await Promise.all([
      findMany({ skip, take }),
      countTotal(),
    ]);

    return { data, total, page: safePage, pageSize: safePageSize };
  }

  private paginate(
    page: number,
    pageSize: number
  ): PaginationOptions & { safePage: number; safePageSize: number } {
    const safePageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
    const safePage = Math.max(page, 1);

    return {
      safePage,
      safePageSize,
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    };
  }
}

export const automationAuditService = new AutomationAuditService();
