

import type { Request, Response, NextFunction } from "express";
import { getRmPerformance, getProductAllocation, getFlowData } from "../services/analytics.service.js";

export async function handleGetRmPerformance(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const performanceResult = await getRmPerformance(orgId);
    response.json(performanceResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetProductAllocation(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const allocationResult = await getProductAllocation(orgId);
    response.json(allocationResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetFlowData(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const flowResult = await getFlowData(orgId);
    response.json(flowResult);
  } catch (error) {
    next(error);
  }
}
