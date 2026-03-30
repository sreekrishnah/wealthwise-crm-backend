import { Router } from "express";
import { handleCreateCheckoutSession, handleCashfreeWebhook, handleVerifyPayment } from "../controllers/billing.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

// Endpoint for the user to initiate a checkout
router.post("/checkout", authenticateToken, handleCreateCheckoutSession);

// Polling endpoint to verify current payment status 
router.get("/verify/:orderId", authenticateToken, handleVerifyPayment);

// Webhook endpoint for Cashfree server-to-server notifications
router.post("/webhook", handleCashfreeWebhook);

export { router as billingRoutes };
