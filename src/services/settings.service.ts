

import { OrganizationModel, type OrganizationDocument } from "../models/organization.model.js";
import { UserModel, type UserDocument } from "../models/user.model.js";
import { logger } from "../utils/logger.js";
import type { ServiceResult } from "../domain/interfaces/index.js";

const SERVICE_NAME = "SETTINGS_SERVICE";

export async function getOrganizationSettings(
  orgId: string
): Promise<ServiceResult<OrganizationDocument>> {
  logger.info(`${SERVICE_NAME}_FETCHING_ORG_SETTINGS - ORG : ${orgId}`);

  const organization = await OrganizationModel.findById(orgId);

  if (!organization) {
    return { success: false, error: "Organization not found.", code: 404 };
  }

  return { success: true, data: organization };
}

export async function updateOrganizationSettings(
  orgId: string,
  updateData: Partial<OrganizationDocument>
): Promise<ServiceResult<OrganizationDocument>> {
  logger.info(`${SERVICE_NAME}_UPDATING_ORG_SETTINGS - ORG : ${orgId}`);

  const updatedOrg = await OrganizationModel.findByIdAndUpdate(
    orgId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!updatedOrg) {
    return { success: false, error: "Organization not found.", code: 404 };
  }

  return { success: true, data: updatedOrg };
}

export async function getOrganizationUsers(
  orgId: string
): Promise<ServiceResult<UserDocument[]>> {
  logger.info(`${SERVICE_NAME}_FETCHING_USERS - ORG : ${orgId}`);

  const userList = await UserModel.find({ orgId, isActive: true })
    .sort({ name: 1 })
    .lean();

  return { success: true, data: userList as any };
}

interface BillingPlanDetails {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
}

const BILLING_PLANS: BillingPlanDetails[] = [
  {
    id: "starter",
    name: "Starter",
    price: "₹2,999",
    period: "/mo",
    features: ["Up to 50 clients", "Basic analytics", "Email support", "1 RM seat"],
  },
  {
    id: "professional",
    name: "Professional",
    price: "₹7,999",
    period: "/mo",
    features: ["Up to 250 clients", "Advanced analytics", "AI Assistant", "5 RM seats", "API access"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "₹19,999",
    period: "/mo",
    features: [
      "Unlimited clients",
      "Custom analytics",
      "Priority AI",
      "Unlimited seats",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

export async function getBillingPlans(): Promise<ServiceResult<BillingPlanDetails[]>> {
  return { success: true, data: BILLING_PLANS };
}

export async function getSubscription(
  orgId: string
): Promise<ServiceResult<{ plan: string; billingCycleStart: Date }>> {
  const organization = await OrganizationModel.findById(orgId).lean();

  if (!organization) {
    return { success: false, error: "Organization not found.", code: 404 };
  }

  return {
    success: true,
    data: {
      plan: organization.billingPlan,
      billingCycleStart: organization.billingCycleStart,
    },
  };
}

export async function updateSubscription(
  orgId: string,
  planId: string
): Promise<ServiceResult<OrganizationDocument>> {
  logger.info(`${SERVICE_NAME}_UPDATING_SUBSCRIPTION - ORG : ${orgId} : PLAN=${planId}`);

  const validPlan = BILLING_PLANS.find((billingPlan) => billingPlan.id === planId);
  if (!validPlan) {
    return { success: false, error: "Invalid billing plan.", code: 400 };
  }

  const planLimits: Record<string, { maxClients: number; maxRmSeats: number; aiAssistantEnabled: boolean }> = {
    starter: { maxClients: 50, maxRmSeats: 1, aiAssistantEnabled: false },
    professional: { maxClients: 250, maxRmSeats: 5, aiAssistantEnabled: true },
    enterprise: { maxClients: 999999, maxRmSeats: 999999, aiAssistantEnabled: true },
  };

  const limits = planLimits[planId] || planLimits.starter;

  const updatedOrg = await OrganizationModel.findByIdAndUpdate(
    orgId,
    {
      $set: {
        billingPlan: planId,
        "settings.maxClients": limits.maxClients,
        "settings.maxRmSeats": limits.maxRmSeats,
        "settings.aiAssistantEnabled": limits.aiAssistantEnabled,
      },
    },
    { new: true }
  );

  if (!updatedOrg) {
    return { success: false, error: "Organization not found.", code: 404 };
  }

  return { success: true, data: updatedOrg };
}
