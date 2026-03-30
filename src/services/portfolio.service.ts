

import { PortfolioHoldingModel, type PortfolioHoldingDocument } from "../models/portfolio-holding.model.js";
import { logger } from "../utils/logger.js";
import type { ServiceResult } from "../domain/interfaces/index.js";

const SERVICE_NAME = "PORTFOLIO_SERVICE";

interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdingCount: number;
}

export async function getPortfolioHoldings(
  orgId: string,
  clientId?: string
): Promise<ServiceResult<PortfolioHoldingDocument[]>> {
  logger.info(`${SERVICE_NAME}_FETCHING_HOLDINGS - ORG : ${orgId}`);

  const queryFilter: Record<string, unknown> = { orgId, isActive: true };
  if (clientId) {
    queryFilter.clientId = clientId;
  }

  const holdings = await PortfolioHoldingModel.find(queryFilter)
    .sort({ value: -1 })
    .lean();

  return { success: true, data: holdings as any };
}

export async function getPortfolioSummary(
  orgId: string,
  clientId?: string
): Promise<ServiceResult<PortfolioSummary>> {
  logger.info(`${SERVICE_NAME}_FETCHING_SUMMARY - ORG : ${orgId}`);

  const matchFilter: Record<string, unknown> = { orgId: { $exists: true }, isActive: true };
  if (clientId) {
    matchFilter.clientId = clientId;
  }

  const aggregation = await PortfolioHoldingModel.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalValue: { $sum: "$value" },
        totalCostBasis: { $sum: "$costBasis" },
        holdingCount: { $sum: 1 },
      },
    },
  ]);

  const summaryData = aggregation[0] || { totalValue: 0, totalCostBasis: 0, holdingCount: 0 };
  const totalGainLoss = summaryData.totalValue - summaryData.totalCostBasis;
  const totalGainLossPercent = summaryData.totalCostBasis > 0
    ? (totalGainLoss / summaryData.totalCostBasis) * 100
    : 0;

  return {
    success: true,
    data: {
      totalValue: summaryData.totalValue,
      totalGainLoss,
      totalGainLossPercent: parseFloat(totalGainLossPercent.toFixed(2)),
      holdingCount: summaryData.holdingCount,
    },
  };
}

export async function getAssetAllocation(
  orgId: string,
  clientId?: string
): Promise<ServiceResult<Array<{ name: string; value: number }>>> {
  logger.info(`${SERVICE_NAME}_FETCHING_ALLOCATION - ORG : ${orgId}`);

  const matchFilter: Record<string, unknown> = { orgId: { $exists: true }, isActive: true };
  if (clientId) {
    matchFilter.clientId = clientId;
  }

  const allocationAggregation = await PortfolioHoldingModel.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$type",
        totalValue: { $sum: "$value" },
      },
    },
    { $sort: { totalValue: -1 } },
  ]);

  const grandTotal = allocationAggregation.reduce((sum, bucket) => sum + bucket.totalValue, 0);

  const allocationBreakdown = allocationAggregation.map((bucket) => ({
    name: bucket._id as string,
    value: grandTotal > 0 ? parseFloat(((bucket.totalValue / grandTotal) * 100).toFixed(1)) : 0,
  }));

  return { success: true, data: allocationBreakdown };
}
