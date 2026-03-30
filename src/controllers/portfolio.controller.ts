

import type { Request, Response, NextFunction } from "express";
import { getPortfolioHoldings, getPortfolioSummary } from "../services/portfolio.service.js";

export async function handleGetHoldings(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const holdingsResult = await getPortfolioHoldings(orgId);
    response.json(holdingsResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetSummary(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const summaryResult = await getPortfolioSummary(orgId);
    response.json(summaryResult);
  } catch (error) {
    next(error);
  }
}
