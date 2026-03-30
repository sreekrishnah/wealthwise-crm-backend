

import type { Request, Response, NextFunction } from "express";
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  getOrganizationUsers,
  getBillingPlans,
  getSubscription,
  updateSubscription,
} from "../services/settings.service.js";
import { logAuditEvent } from "../services/audit.service.js";

export async function handleGetOrgSettings(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const settingsResult = await getOrganizationSettings(orgId);
    response.json(settingsResult);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateOrgSettings(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const updateResult = await updateOrganizationSettings(orgId, request.body);

    if (updateResult.success) {
      await logAuditEvent({
        orgId,
        userId: request.user!.userId,
        action: "ORG_SETTINGS_UPDATED",
        resourceType: "organization",
        resourceId: orgId,
        details: { updatedFields: Object.keys(request.body) },
        ipAddress: request.ip,
      });
    }

    response.json(updateResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetUsers(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const usersResult = await getOrganizationUsers(orgId);
    response.json(usersResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetBillingPlans(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const plansResult = await getBillingPlans();
    response.json(plansResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetSubscription(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const subscriptionResult = await getSubscription(orgId);
    response.json(subscriptionResult);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateSubscription(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const { planId } = request.body;
    const updateResult = await updateSubscription(orgId, planId);

    if (updateResult.success) {
      await logAuditEvent({
        orgId,
        userId: request.user!.userId,
        action: "SUBSCRIPTION_UPDATED",
        resourceType: "billing",
        resourceId: orgId,
        details: { newPlan: planId },
        ipAddress: request.ip,
      });
    }

    response.json(updateResult);
  } catch (error) {
    next(error);
  }
}
