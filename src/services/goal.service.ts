

import { GoalModel, type GoalDocument } from "../models/goal.model.js";
import { logger } from "../utils/logger.js";
import type { ServiceResult } from "../domain/interfaces/index.js";

const SERVICE_NAME = "GOAL_SERVICE";

export async function getGoals(
  orgId: string,
  clientId?: string
): Promise<ServiceResult<GoalDocument[]>> {
  logger.info(`${SERVICE_NAME}_FETCHING_GOALS - ORG : ${orgId}`);

  const queryFilter: Record<string, unknown> = { orgId };
  if (clientId) queryFilter.clientId = clientId;

  const goalList = await GoalModel.find(queryFilter).sort({ deadline: 1 }).lean();

  return { success: true, data: goalList as any };
}

export async function createGoal(
  orgId: string,
  goalData: Partial<GoalDocument>
): Promise<ServiceResult<GoalDocument>> {
  logger.info(`${SERVICE_NAME}_CREATING_GOAL - ORG : ${orgId}`);

  const createdGoal = await GoalModel.create({ ...goalData, orgId });

  logger.info(`${SERVICE_NAME}_GOAL_CREATED - ${createdGoal._id}`);
  return { success: true, data: createdGoal };
}

export async function updateGoal(
  orgId: string,
  goalId: string,
  updateData: Partial<GoalDocument>
): Promise<ServiceResult<GoalDocument>> {
  logger.info(`${SERVICE_NAME}_UPDATING_GOAL - ${goalId}`);

  const updatedGoal = await GoalModel.findOneAndUpdate(
    { _id: goalId, orgId },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!updatedGoal) {
    return { success: false, error: "Goal not found.", code: 404 };
  }

  return { success: true, data: updatedGoal };
}
