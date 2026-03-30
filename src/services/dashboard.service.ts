

import { ClientModel } from "../models/client.model.js";
import { AumSnapshotModel } from "../models/aum-snapshot.model.js";
import { ComplianceTaskModel } from "../models/compliance-task.model.js";
import { ReviewModel } from "../models/review.model.js";
import { logger } from "../utils/logger.js";
import type { ServiceResult, KpiMetric, AumTrendPoint } from "../domain/interfaces/index.js";
import { RiskLevel, ComplianceStatus } from "../domain/enums/index.js";

const SERVICE_NAME = "DASHBOARD_SERVICE";

interface DashboardKpis {
  totalAum: KpiMetric;
  inflows: KpiMetric;
  clientsAtRisk: KpiMetric;
  complianceOverdue: KpiMetric;
}

export async function getDashboardKpis(orgId: string): Promise<ServiceResult<DashboardKpis>> {
  logger.info(`${SERVICE_NAME}_FETCHING_KPIS - ORG : ${orgId}`);

  const [aumAggregation, atRiskCount, overdueCount, previousMonthSnapshot] = await Promise.all([
    ClientModel.aggregate([
      { $match: { orgId: { $exists: true }, isActive: true } },
      { $group: { _id: null, totalAum: { $sum: "$aum" }, clientCount: { $sum: 1 } } },
    ]),
    ClientModel.countDocuments({
      orgId,
      isActive: true,
      riskLevel: { $in: [RiskLevel.HIGH, RiskLevel.CRITICAL] },
    }),
    ComplianceTaskModel.countDocuments({
      orgId,
      status: ComplianceStatus.OVERDUE,
    }),
    AumSnapshotModel.findOne({ orgId }).sort({ year: -1, month: -1 }).lean(),
  ]);

  const currentTotalAum = aumAggregation[0]?.totalAum || 0;
  const previousAum = previousMonthSnapshot?.totalAum || currentTotalAum;
  const aumChangePercent = previousAum > 0 ? ((currentTotalAum - previousAum) / previousAum) * 100 : 0;

  const formattedAum = formatIndianCurrency(currentTotalAum);
  const inflowAmount = previousMonthSnapshot?.inflow || 0;

  return {
    success: true,
    data: {
      totalAum: {
        label: "Total AUM",
        value: formattedAum,
        change: parseFloat(aumChangePercent.toFixed(1)),
        changeLabel: "vs last month",
        icon: "IndianRupee",
      },
      inflows: {
        label: "Inflows",
        value: formatIndianCurrency(inflowAmount),
        change: 12.5,
        changeLabel: "this month",
        icon: "ArrowUpRight",
      },
      clientsAtRisk: {
        label: "Clients at Risk",
        value: atRiskCount.toString(),
        change: -1,
        changeLabel: "vs last month",
        icon: "Users",
      },
      complianceOverdue: {
        label: "Compliance Overdue",
        value: overdueCount.toString(),
        change: -33,
        changeLabel: "vs last month",
        icon: "ShieldAlert",
      },
    },
  };
}

export async function getAumTrend(orgId: string): Promise<ServiceResult<AumTrendPoint[]>> {
  logger.info(`${SERVICE_NAME}_FETCHING_AUM_TREND - ORG : ${orgId}`);

  const snapshots = await AumSnapshotModel.find({ orgId })
    .sort({ year: 1, month: 1 })
    .limit(12)
    .lean();

  const trendPoints: AumTrendPoint[] = snapshots.map((snapshot) => ({
    month: snapshot.month,
    aum: snapshot.totalAum / 10000000,
  }));

  return { success: true, data: trendPoints };
}

interface ChurnRiskClient {
  id: string;
  name: string;
  aum: number;
  riskScore: number;
  riskLevel: string;
}

export async function getChurnRiskClients(orgId: string): Promise<ServiceResult<ChurnRiskClient[]>> {
  logger.info(`${SERVICE_NAME}_FETCHING_CHURN_RISK - ORG : ${orgId}`);

  const highRiskClients = await ClientModel.find({
    orgId,
    isActive: true,
    riskLevel: { $in: [RiskLevel.HIGH, RiskLevel.CRITICAL] },
  })
    .sort({ riskScore: -1 })
    .limit(10)
    .lean();

  const riskClientList: ChurnRiskClient[] = highRiskClients.map((client) => ({
    id: client._id.toString(),
    name: client.name,
    aum: client.aum,
    riskScore: client.riskScore,
    riskLevel: client.riskLevel,
  }));

  return { success: true, data: riskClientList };
}

function formatIndianCurrency(amountInRupees: number): string {
  if (amountInRupees >= 10000000) {
    return `₹${(amountInRupees / 10000000).toFixed(1)}Cr`;
  }
  if (amountInRupees >= 100000) {
    return `₹${(amountInRupees / 100000).toFixed(1)}L`;
  }
  return `₹${amountInRupees.toLocaleString("en-IN")}`;
}
