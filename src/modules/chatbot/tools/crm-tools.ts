

import { logger } from "../../../utils/logger.js";
import { ClientModel } from "../../../models/client.model.js";
import { ReviewModel } from "../../../models/review.model.js";
import { ComplianceTaskModel } from "../../../models/compliance-task.model.js";
import { GoalModel } from "../../../models/goal.model.js";
import { PortfolioHoldingModel } from "../../../models/portfolio-holding.model.js";
import { RiskLevel, ComplianceStatus } from "../../../domain/enums/index.js";

const SERVICE_NAME = "CRM_TOOLS";

interface ToolResult {
  success: boolean;
  data: string;
}

export async function getHighRiskClients(orgId: string): Promise<ToolResult> {
  logger.info(`${SERVICE_NAME}_GET_HIGH_RISK_CLIENTS - ORG : ${orgId}`);

  const riskyClients = await ClientModel.find({
    orgId,
    isActive: true,
    riskLevel: { $in: [RiskLevel.HIGH, RiskLevel.CRITICAL] },
  })
    .sort({ riskScore: -1 })
    .limit(10)
    .lean();

  if (riskyClients.length === 0) {
    return { success: true, data: "No clients currently flagged as high or critical risk." };
  }

  const clientSummaries = riskyClients.map((client, index) => {
    const aumInCrores = (client.aum / 10000000).toFixed(2);
    return `${index + 1}. **${client.name}** — Risk Score: ${client.riskScore} (${client.riskLevel}), AUM: ₹${aumInCrores}Cr`;
  });

  return {
    success: true,
    data: `📊 **${riskyClients.length} clients with high/critical risk:**\n\n${clientSummaries.join("\n")}\n\n⚠️ Recommend immediate portfolio review for these clients.`,
  };
}

export async function getTopAumClients(orgId: string, limitCount: number = 5): Promise<ToolResult> {
  logger.info(`${SERVICE_NAME}_GET_TOP_AUM_CLIENTS - ORG : ${orgId}`);

  const topClients = await ClientModel.find({ orgId, isActive: true })
    .sort({ aum: -1 })
    .limit(limitCount)
    .lean();

  const clientSummaries = topClients.map((client, index) => {
    const aumInCrores = (client.aum / 10000000).toFixed(2);
    return `${index + 1}. **${client.name}** — ₹${aumInCrores}Cr`;
  });

  const totalAum = topClients.reduce((sum, client) => sum + client.aum, 0);
  const totalAumCr = (totalAum / 10000000).toFixed(2);

  return {
    success: true,
    data: `💰 **Top ${limitCount} clients by AUM:**\n\n${clientSummaries.join("\n")}\n\nTotal AUM from top ${limitCount}: ₹${totalAumCr}Cr`,
  };
}

export async function getUpcomingReviews(orgId: string): Promise<ToolResult> {
  logger.info(`${SERVICE_NAME}_GET_UPCOMING_REVIEWS - ORG : ${orgId}`);

  const upcomingReviews = await ReviewModel.find({
    orgId,
    status: "scheduled",
    date: { $gte: new Date() },
  })
    .sort({ date: 1 })
    .limit(10)
    .lean();

  if (upcomingReviews.length === 0) {
    return { success: true, data: "No upcoming reviews scheduled." };
  }

  const reviewSummaries = upcomingReviews.map((review, index) => {
    const dateStr = new Date(review.date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    return `${index + 1}. ${review.clientName} — ${dateStr} (${review.rmName})`;
  });

  return {
    success: true,
    data: `📅 **${upcomingReviews.length} reviews scheduled:**\n\n${reviewSummaries.join("\n")}\n\nWould you like to reschedule any?`,
  };
}

export async function getComplianceOverdue(orgId: string): Promise<ToolResult> {
  logger.info(`${SERVICE_NAME}_GET_COMPLIANCE_OVERDUE - ORG : ${orgId}`);

  const overdueTasks = await ComplianceTaskModel.find({
    orgId,
    status: { $in: [ComplianceStatus.OVERDUE, ComplianceStatus.PENDING] },
  })
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();

  if (overdueTasks.length === 0) {
    return { success: true, data: "All compliance tasks are up to date. ✅" };
  }

  const typeLabels: Record<string, string> = {
    kyc_renewal: "KYC Renewal",
    risk_profile: "Risk Profile",
    nomination: "Nomination",
  };

  const taskSummaries = overdueTasks.map((task) => {
    const dateStr = new Date(task.dueDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    const statusIcon = task.status === "overdue" ? "🔴" : "🟡";
    return `${statusIcon} **${task.clientName}** — ${typeLabels[task.type] || task.type} (Due: ${dateStr})`;
  });

  const overdueCount = overdueTasks.filter((task) => task.status === "overdue").length;

  return {
    success: true,
    data: `⚠️ **${overdueCount} overdue, ${overdueTasks.length - overdueCount} pending compliance tasks:**\n\n${taskSummaries.join("\n")}\n\nShall I schedule reminders?`,
  };
}

export async function searchClients(orgId: string, searchQuery: string): Promise<ToolResult> {
  logger.info(`${SERVICE_NAME}_SEARCH_CLIENTS - ORG : ${orgId} : QUERY : ${searchQuery}`);

  const matchingClients = await ClientModel.find({
    orgId,
    isActive: true,
    $or: [
      { name: { $regex: searchQuery, $options: "i" } },
      { email: { $regex: searchQuery, $options: "i" } },
    ],
  })
    .limit(5)
    .lean();

  if (matchingClients.length === 0) {
    return { success: true, data: `No clients found matching "${searchQuery}".` };
  }

  const clientSummaries = matchingClients.map((client) => {
    const aumInCrores = (client.aum / 10000000).toFixed(2);
    return `• **${client.name}** (${client.segment}) — AUM: ₹${aumInCrores}Cr, Risk: ${client.riskLevel}, KYC: ${client.kycStatus}`;
  });

  return {
    success: true,
    data: `🔍 **Found ${matchingClients.length} clients:**\n\n${clientSummaries.join("\n")}`,
  };
}

export async function getClientGoals(orgId: string, clientName: string): Promise<ToolResult> {
  logger.info(`${SERVICE_NAME}_GET_CLIENT_GOALS - ORG : ${orgId} : CLIENT : ${clientName}`);

  const client = await ClientModel.findOne({
    orgId,
    name: { $regex: clientName, $options: "i" },
    isActive: true,
  }).lean();

  if (!client) {
    return { success: true, data: `Client "${clientName}" not found.` };
  }

  const goals = await GoalModel.find({ orgId, clientId: client._id }).lean();

  if (goals.length === 0) {
    return { success: true, data: `No financial goals set for ${client.name}.` };
  }

  const goalSummaries = goals.map((goal) => {
    const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);
    const currentCr = (goal.currentAmount / 10000000).toFixed(2);
    const targetCr = (goal.targetAmount / 10000000).toFixed(2);
    const statusIcon = goal.status === "on_track" ? "✅" : "⚠️";
    return `${statusIcon} **${goal.name}** — ₹${currentCr}Cr / ₹${targetCr}Cr (${progress}%)`;
  });

  return {
    success: true,
    data: `🎯 **Goals for ${client.name}:**\n\n${goalSummaries.join("\n")}`,
  };
}
