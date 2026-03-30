

import { Router } from "express";
import { handleGetComplianceTasks, handleUpdateComplianceTask, handleCreateComplianceTask } from "../controllers/compliance.controller.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware.js";
import { UserRole } from "../domain/enums/index.js";

const complianceRouter = Router();

complianceRouter.use(authenticateToken);

complianceRouter.get("/tasks", handleGetComplianceTasks);
complianceRouter.post("/tasks", authorizeRoles(UserRole.ADMIN, UserRole.RM), handleCreateComplianceTask);
complianceRouter.patch("/tasks/:id", authorizeRoles(UserRole.ADMIN, UserRole.RM), handleUpdateComplianceTask);

export { complianceRouter };
