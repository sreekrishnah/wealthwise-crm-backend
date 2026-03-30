

import { Router } from "express";
import { handleGetReviews, handleCreateReview, handleUpdateReview } from "../controllers/review.controller.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware.js";
import { UserRole } from "../domain/enums/index.js";

const reviewRouter = Router();

reviewRouter.use(authenticateToken);

reviewRouter.get("/", handleGetReviews);
reviewRouter.post("/", authorizeRoles(UserRole.ADMIN, UserRole.RM), handleCreateReview);
reviewRouter.patch("/:id", authorizeRoles(UserRole.ADMIN, UserRole.RM), handleUpdateReview);

export { reviewRouter };
