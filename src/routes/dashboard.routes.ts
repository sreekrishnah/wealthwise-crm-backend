

import { Router } from "express";
import {
  handleGetKpis,
  handleGetAumTrend,
  handleGetChurnRisk,
  handleGetUpcomingReviews,
  handleGetComplianceAlerts,
} from "../controllers/dashboard.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const dashboardRouter = Router();

dashboardRouter.use(authenticateToken);

// Single endpoint for full dashboard overview
dashboardRouter.get("/", handleGetKpis);

dashboardRouter.get("/kpis", handleGetKpis);
dashboardRouter.get("/aum-trend", handleGetAumTrend);
dashboardRouter.get("/churn-risk", handleGetChurnRisk);
dashboardRouter.get("/upcoming-reviews", handleGetUpcomingReviews);
dashboardRouter.get("/compliance-alerts", handleGetComplianceAlerts);

export { dashboardRouter };
