

import { AuditLogModel } from "../models/audit-log.model.js";
import { logger } from "../utils/logger.js";

const SERVICE_NAME = "AUDIT_SERVICE";

interface AuditEntry {
  orgId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    await AuditLogModel.create({
      orgId: entry.orgId,
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      details: entry.details || {},
      ipAddress: entry.ipAddress || "",
      userAgent: entry.userAgent || "",
    });

    logger.info(
      `${SERVICE_NAME}_EVENT_LOGGED - ${entry.userId} : ${entry.action} -> ${entry.resourceType}/${entry.resourceId}`
    );
  } catch (loggingError) {
    // WHY: Audit failures must NOT block the primary operation
    const errorMessage = loggingError instanceof Error ? loggingError.message : "Unknown audit error";
    logger.error(`${SERVICE_NAME}_LOGGING_FAILED - ${entry.userId} : ${errorMessage}`);
  }
}

export async function getAuditLogs(
  orgId: string,
  options: { page: number; limit: number; resourceType?: string; action?: string }
): Promise<{ data: unknown[]; total: number }> {
  const queryFilter: Record<string, unknown> = { orgId };
  if (options.resourceType) queryFilter.resourceType = options.resourceType;
  if (options.action) queryFilter.action = options.action;

  const skipCount = (options.page - 1) * options.limit;

  const [logs, totalCount] = await Promise.all([
    AuditLogModel.find(queryFilter).sort({ timestamp: -1 }).skip(skipCount).limit(options.limit).lean(),
    AuditLogModel.countDocuments(queryFilter),
  ]);

  return { data: logs, total: totalCount };
}
