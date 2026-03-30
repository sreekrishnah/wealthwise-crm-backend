

import { ClientModel } from "../models/client.model.js";
import { PortfolioHoldingModel } from "../models/portfolio-holding.model.js";
import { AumSnapshotModel } from "../models/aum-snapshot.model.js";
import { logger } from "../utils/logger.js";
import type {
  ServiceResult,
  RmPerformanceEntry,
  ProductAllocationEntry,
  FlowDataPoint,
} from "../domain/interfaces/index.js";

const SERVICE_NAME = "ANALYTICS_SERVICE";

const PRODUCT_COLORS: Record<string, string> = {
  "Mutual Fund": "hsl(168, 55%, 28%)",
  "Equity": "hsl(220, 70%, 55%)",
  "FD": "hsl(36, 90%, 55%)",
  "Insurance": "hsl(280, 60%, 55%)",
  "Gold": "hsl(45, 90%, 55%)",
  "Real Estate": "hsl(0, 60%, 55%)",
  "Other": "hsl(220, 10%, 70%)",
};

export async function getRmPerformance(
  orgId: string
): Promise<ServiceResult<RmPerformanceEntry[]>> {
  logger.info(`${SERVICE_NAME}_FETCHING_RM_PERFORMANCE - ORG : ${orgId}`);

  const rmAggregation = await ClientModel.aggregate([
    { $match: { orgId: { $exists: true }, isActive: true } },
    {
      $group: {
        _id: "$rmName",
        totalAum: { $sum: "$aum" },
        clientCount: { $sum: 1 },
      },
    },
    { $sort: { totalAum: -1 } },
  ]);

  const performanceEntries: RmPerformanceEntry[] = rmAggregation.map((rmEntry) => ({
    name: rmEntry._id as string,
    aum: parseFloat((rmEntry.totalAum / 10000000).toFixed(1)),
    clients: rmEntry.clientCount as number,
  }));

  return { success: true, data: performanceEntries };
}

export async function getProductAllocation(
  orgId: string
): Promise<ServiceResult<ProductAllocationEntry[]>> {
  logger.info(`${SERVICE_NAME}_FETCHING_PRODUCT_ALLOCATION - ORG : ${orgId}`);

  const allocationAggregation = await PortfolioHoldingModel.aggregate([
    { $match: { orgId: { $exists: true }, isActive: true } },
    {
      $group: {
        _id: "$type",
        totalValue: { $sum: "$value" },
      },
    },
    { $sort: { totalValue: -1 } },
  ]);

  const grandTotal = allocationAggregation.reduce(
    (sum, bucket) => sum + (bucket.totalValue as number),
    0
  );

  const allocationEntries: ProductAllocationEntry[] = allocationAggregation.map((bucket) => ({
    name: bucket._id as string,
    value: grandTotal > 0 ? parseFloat(((bucket.totalValue / grandTotal) * 100).toFixed(1)) : 0,
    color: PRODUCT_COLORS[bucket._id as string] || PRODUCT_COLORS["Other"],
  }));

  return { success: true, data: allocationEntries };
}

export async function getFlowData(
  orgId: string
): Promise<ServiceResult<FlowDataPoint[]>> {
  logger.info(`${SERVICE_NAME}_FETCHING_FLOW_DATA - ORG : ${orgId}`);

  const snapshots = await AumSnapshotModel.find({ orgId })
    .sort({ year: 1, month: 1 })
    .limit(6)
    .lean();

  const flowPoints: FlowDataPoint[] = snapshots.map((snapshot) => ({
    month: snapshot.month,
    inflow: parseFloat((snapshot.inflow / 10000000).toFixed(1)),
    outflow: parseFloat((snapshot.outflow / 10000000).toFixed(1)),
  }));

  return { success: true, data: flowPoints };
}
