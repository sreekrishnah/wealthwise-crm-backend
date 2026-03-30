

import type { Request, Response, NextFunction } from "express";
import { getComplianceTasks, updateComplianceTask, createComplianceTask } from "../services/compliance.service.js";
import { logAuditEvent } from "../services/audit.service.js";

export async function handleGetComplianceTasks(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const { status, type, page, limit } = request.query;

    const tasksResult = await getComplianceTasks(orgId, {
      status: status as string,
      type: type as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
    });

    response.json(tasksResult);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateComplianceTask(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const updateResult = await updateComplianceTask(orgId, (request.params.id as string), request.body);

    if (!updateResult.success) {
      response.status(updateResult.code || 400).json(updateResult);
      return;
    }

    await logAuditEvent({
      orgId,
      userId: request.user!.userId,
      action: "COMPLIANCE_TASK_UPDATED",
      resourceType: "compliance_task",
      resourceId: (request.params.id as string),
      details: { newStatus: request.body.status },
      ipAddress: request.ip,
    });

    response.json(updateResult);
  } catch (error) {
    next(error);
  }
}

export async function handleCreateComplianceTask(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const createResult = await createComplianceTask(orgId, request.body);

    if (createResult.success) {
      await logAuditEvent({
        orgId,
        userId: request.user!.userId,
        action: "COMPLIANCE_TASK_CREATED",
        resourceType: "compliance_task",
        resourceId: createResult.data!._id.toString(),
        ipAddress: request.ip,
      });
    }

    response.status(201).json(createResult);
  } catch (error) {
    next(error);
  }
}
