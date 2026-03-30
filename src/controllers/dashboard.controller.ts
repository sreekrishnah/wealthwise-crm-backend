

import type { Request, Response, NextFunction } from "express";
import {
  getDashboardKpis,
  getAumTrend,
  getChurnRiskClients,
} from "../services/dashboard.service.js";
import { getUpcomingReviews } from "../services/review.service.js";
import { getComplianceAlerts } from "../services/compliance.service.js";

export async function handleGetKpis(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const kpiResult = await getDashboardKpis(orgId);
    response.json(kpiResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetAumTrend(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const trendResult = await getAumTrend(orgId);
    response.json(trendResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetChurnRisk(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const riskResult = await getChurnRiskClients(orgId);
    response.json(riskResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetUpcomingReviews(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const reviewsResult = await getUpcomingReviews(orgId);
    response.json(reviewsResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetComplianceAlerts(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const alertsResult = await getComplianceAlerts(orgId);
    response.json(alertsResult);
  } catch (error) {
    next(error);
  }
}
