

import { ComplianceTaskModel, type ComplianceTaskDocument } from "../models/compliance-task.model.js";
import { logger } from "../utils/logger.js";
import type { ServiceResult, PaginatedResult } from "../domain/interfaces/index.js";
import { ComplianceStatus } from "../domain/enums/index.js";

const SERVICE_NAME = "COMPLIANCE_SERVICE";

export async function getComplianceTasks(
  orgId: string,
  options: { status?: string; clientId?: string; type?: string; page: number; limit: number }
): Promise<ServiceResult<PaginatedResult<ComplianceTaskDocument>>> {
  logger.info(`${SERVICE_NAME}_FETCHING_TASKS - ORG : ${orgId}`);

  const queryFilter: Record<string, unknown> = { orgId };
  if (options.status) queryFilter.status = options.status;
  if (options.clientId) queryFilter.clientId = options.clientId;
  if (options.type) queryFilter.type = options.type;

  const skipCount = (options.page - 1) * options.limit;

  const statusSortOrder: Record<string, number> = {
    [ComplianceStatus.OVERDUE]: 0,
    [ComplianceStatus.PENDING]: 1,
    [ComplianceStatus.COMPLETED]: 2,
  };

  const [taskList, totalCount] = await Promise.all([
    ComplianceTaskModel.find(queryFilter).sort({ dueDate: 1 }).skip(skipCount).limit(options.limit).lean(),
    ComplianceTaskModel.countDocuments(queryFilter),
  ]);

  const sortedTasks = (taskList as any).sort(
    (taskA: any, taskB: any) => (statusSortOrder[taskA.status] ?? 3) - (statusSortOrder[taskB.status] ?? 3)
  );

  const totalPages = Math.ceil(totalCount / options.limit);

  return {
    success: true,
    data: {
      data: sortedTasks,
      total: totalCount,
      page: options.page,
      totalPages,
      hasNextPage: options.page < totalPages,
    },
  };
}

export async function updateComplianceTask(
  orgId: string,
  taskId: string,
  updateData: Partial<ComplianceTaskDocument>
): Promise<ServiceResult<ComplianceTaskDocument>> {
  logger.info(`${SERVICE_NAME}_UPDATING_TASK - ${taskId}`);

  if (updateData.status === ComplianceStatus.COMPLETED) {
    updateData.completedAt = new Date();
  }

  const updatedTask = await ComplianceTaskModel.findOneAndUpdate(
    { _id: taskId, orgId },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!updatedTask) {
    return { success: false, error: "Compliance task not found.", code: 404 };
  }

  logger.info(`${SERVICE_NAME}_TASK_UPDATED - ${taskId} : status=${updatedTask.status}`);
  return { success: true, data: updatedTask };
}

export async function createComplianceTask(
  orgId: string,
  taskData: Partial<ComplianceTaskDocument>
): Promise<ServiceResult<ComplianceTaskDocument>> {
  logger.info(`${SERVICE_NAME}_CREATING_TASK - ORG : ${orgId}`);

  const createdTask = await ComplianceTaskModel.create({ ...taskData, orgId });

  logger.info(`${SERVICE_NAME}_TASK_CREATED - ${createdTask._id}`);
  return { success: true, data: createdTask };
}

export async function getComplianceAlerts(
  orgId: string
): Promise<ServiceResult<ComplianceTaskDocument[]>> {
  logger.info(`${SERVICE_NAME}_FETCHING_ALERTS - ORG : ${orgId}`);

  const alertTasks = await ComplianceTaskModel.find({
    orgId,
    status: { $in: [ComplianceStatus.OVERDUE, ComplianceStatus.PENDING] },
  })
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();

  return { success: true, data: alertTasks as any };
}
