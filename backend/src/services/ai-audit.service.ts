import {
  aiAuditEventRepository,
  AiAuditEventRepository,
  type PaginationOptions,
} from "../repositories/ai-audit-event.repository.js";
import { AI_CORE_CACHE_INVALIDATE, aiCoreCacheEvents, CACHE_INVALIDATING_ACTIONS } from "./ai-cache-invalidation.events.js";
import type { AiAuditAction } from "../generated/prisma/enums.js";
import type { AiAuditEvent } from "../generated/prisma/client.js";

export interface RecordAiAuditEventInput {
  actorId?: string | null;
  action: AiAuditAction;
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

// The single entry point every other AI Core service calls to write an
// audit row — mirrors AutomationAuditService exactly. Also the one place
// AiRoutingService's in-memory cache invalidation is triggered from (TDD
// §8): after a successful write, record() emits AI_CORE_CACHE_INVALIDATE
// for any action in CACHE_INVALIDATING_ACTIONS.
export class AiAuditService {
  constructor(private readonly repository: AiAuditEventRepository = aiAuditEventRepository) {}

  async record(input: RecordAiAuditEventInput): Promise<AiAuditEvent> {
    const event = await this.repository.create(input);

    if (CACHE_INVALIDATING_ACTIONS.has(input.action)) {
      aiCoreCacheEvents.emit(AI_CORE_CACHE_INVALIDATE, {
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
      });
    }

    return event;
  }

  async listByTarget(targetType: string, targetId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<PagedResult<AiAuditEvent>> {
    return this.paginatedQuery(
      (options) => this.repository.findByTarget(targetType, targetId, options),
      () => this.repository.countByTarget(targetType, targetId),
      page,
      pageSize
    );
  }

  async listRecent(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<PagedResult<AiAuditEvent>> {
    return this.paginatedQuery(
      (options) => this.repository.findRecent(options),
      () => this.repository.count(),
      page,
      pageSize
    );
  }

  private async paginatedQuery(
    findMany: (options: PaginationOptions) => Promise<AiAuditEvent[]>,
    countTotal: () => Promise<number>,
    page: number,
    pageSize: number
  ): Promise<PagedResult<AiAuditEvent>> {
    const { safePage, safePageSize, skip, take } = this.paginate(page, pageSize);
    const [data, total] = await Promise.all([findMany({ skip, take }), countTotal()]);
    return { data, total, page: safePage, pageSize: safePageSize };
  }

  private paginate(page: number, pageSize: number): PaginationOptions & { safePage: number; safePageSize: number } {
    const safePageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
    const safePage = Math.max(page, 1);
    return { safePage, safePageSize, skip: (safePage - 1) * safePageSize, take: safePageSize };
  }
}

export const aiAuditService = new AiAuditService();
