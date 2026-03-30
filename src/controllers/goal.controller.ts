

import type { Request, Response, NextFunction } from "express";
import { getGoals, createGoal, updateGoal } from "../services/goal.service.js";
import { logAuditEvent } from "../services/audit.service.js";

export async function handleGetGoals(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const { clientId } = request.query;
    const goalsResult = await getGoals(orgId, clientId as string);
    response.json(goalsResult);
  } catch (error) {
    next(error);
  }
}

export async function handleCreateGoal(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const createResult = await createGoal(orgId, request.body);

    if (createResult.success) {
      await logAuditEvent({
        orgId,
        userId: request.user!.userId,
        action: "GOAL_CREATED",
        resourceType: "goal",
        resourceId: createResult.data!._id.toString(),
        ipAddress: request.ip,
      });
    }

    response.status(201).json(createResult);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateGoal(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const updateResult = await updateGoal(orgId, (request.params.id as string), request.body);

    if (!updateResult.success) {
      response.status(updateResult.code || 400).json(updateResult);
      return;
    }

    response.json(updateResult);
  } catch (error) {
    next(error);
  }
}
