

import { Router } from "express";
import {
  handleGetClients,
  handleGetClientById,
  handleCreateClient,
  handleUpdateClient,
  handleGetClientPortfolio,
  handleGetClientReviews,
  handleGetClientGoals,
  handleGetClientCompliance,
} from "../controllers/client.controller.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware.js";
import { UserRole } from "../domain/enums/index.js";

const clientRouter = Router();

clientRouter.use(authenticateToken);

clientRouter.get("/", handleGetClients);
clientRouter.get("/:id", handleGetClientById);
clientRouter.post("/", authorizeRoles(UserRole.ADMIN, UserRole.RM), handleCreateClient);
clientRouter.patch("/:id", authorizeRoles(UserRole.ADMIN, UserRole.RM), handleUpdateClient);

// Client sub-resources (ClientDetail tabs)
clientRouter.get("/:id/portfolio", handleGetClientPortfolio);
clientRouter.get("/:id/reviews", handleGetClientReviews);
clientRouter.get("/:id/goals", handleGetClientGoals);
clientRouter.get("/:id/compliance", handleGetClientCompliance);

export { clientRouter };
