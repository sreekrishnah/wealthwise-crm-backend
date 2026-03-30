

import { Router } from "express";
import { handleGetPipelineStages, handleMovePipelineStage } from "../controllers/client.controller.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware.js";
import { UserRole } from "../domain/enums/index.js";

const pipelineRouter = Router();

pipelineRouter.use(authenticateToken);

pipelineRouter.get("/stages", handleGetPipelineStages);
pipelineRouter.patch("/move", authorizeRoles(UserRole.ADMIN, UserRole.RM), handleMovePipelineStage);

export { pipelineRouter };
