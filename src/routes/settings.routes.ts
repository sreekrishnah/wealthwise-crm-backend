

import { Router } from "express";
import {
  handleGetOrgSettings,
  handleUpdateOrgSettings,
  handleGetUsers,
  handleGetBillingPlans,
  handleGetSubscription,
  handleUpdateSubscription,
} from "../controllers/settings.controller.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware.js";
import { UserRole } from "../domain/enums/index.js";

const settingsRouter = Router();

settingsRouter.use(authenticateToken);

settingsRouter.get("/organization", handleGetOrgSettings);
settingsRouter.put("/organization", authorizeRoles(UserRole.ADMIN), handleUpdateOrgSettings);
settingsRouter.get("/users", authorizeRoles(UserRole.ADMIN), handleGetUsers);

// Billing
settingsRouter.get("/billing/plans", handleGetBillingPlans);
settingsRouter.get("/billing/subscription", handleGetSubscription);
settingsRouter.put("/billing/subscription", authorizeRoles(UserRole.ADMIN), handleUpdateSubscription);

export { settingsRouter };
