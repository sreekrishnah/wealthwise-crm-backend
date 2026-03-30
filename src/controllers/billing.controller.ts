import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { OrganizationModel } from "../models/organization.model.js";
import { logAuditEvent } from "../services/audit.service.js";

const SERVICE_NAME = "BILLING_CONTROLLER";

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || "TEST_APP_ID";
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || "TEST_SECRET_KEY";
const CASHFREE_ENV = process.env.CASHFREE_ENV || "SANDBOX"; // SANDBOX or PRODUCTION

const CASHFREE_BASE_URL = CASHFREE_ENV === "PRODUCTION"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

export async function handleCreateCheckoutSession(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { planId } = request.body;
    const orgId = request.user!.orgId;

    // Plans definition (sync with frontend)
    const planPrices: Record<string, number> = {
      starter: 2999,
      pro: 7999,
      enterprise: 19999,
    };

    if (!planPrices[planId]) {
      response.status(400).json({ success: false, error: "Invalid plan selected" });
      return;
    }

    const orderId = `ORDER_${orgId}_${Date.now()}`;
    const amount = planPrices[planId];

    // Create Cashfree Order
    const cfResponse = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: request.user!.userId.toString(),
          customer_phone: "9999999999",
          customer_email: "billing@example.com",
          customer_name: request.user!.name,
        },
        order_meta: {
          return_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/billing?order_id={order_id}`,
        },
      }),
    });

    const data = await cfResponse.json();

    if (!cfResponse.ok) {
      logger.error(`${SERVICE_NAME}_CHECKOUT_FAILED - ${orgId} : ${JSON.stringify(data)}`);
      response.status(500).json({ success: false, error: "Payment gateway error" });
      return;
    }

    // Audit log
    await logAuditEvent({
      orgId,
      userId: request.user!.userId,
      action: "BILLING_CHECKOUT_STARTED",
      resourceType: "organization",
      resourceId: orgId,
      details: { planId, amount, orderId },
    });

    response.json({
      success: true,
      data: {
        payment_session_id: data.payment_session_id,
        order_id: orderId,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleCashfreeWebhook(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    // Basic verification - In production, verify the webhook signature
    const { data, type } = request.body;
    
    if (type === "PAYMENT_SUCCESS_WEBHOOK") {
      const orderId = data.order.order_id; // e.g., ORDER_ORGID_TIMESTAMP
      const orgId = orderId.split("_")[1];

      // Assuming plan upgrades logically update the org
      await OrganizationModel.findByIdAndUpdate(orgId, {
        "settings.billingPlan": "pro", // Ideally extract the actual plan context from order
        status: "active"
      });

      logger.info(`${SERVICE_NAME}_PAYMENT_SUCCESSFUL - ${orgId} : Order ${orderId}`);
    }

    response.status(200).send("OK");
  } catch (error) {
    logger.error(`${SERVICE_NAME}_WEBHOOK_ERROR - SYS : ${error}`);
    response.status(500).send("ERROR");
  }
}

export async function handleVerifyPayment(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { orderId } = request.params;
    const orgId = request.user!.orgId;

    // Call Cashfree to check order status
    const cfResponse = await fetch(`${CASHFREE_BASE_URL}/orders/${orderId}`, {
      method: "GET",
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
      },
    });

    const data = await cfResponse.json();

    if (!cfResponse.ok) {
        response.status(404).json({ success: false, error: "Order not found" });
        return;
    }

    // Map Cashfree status to our internal state
    const orderStatus = data.order_status; // PAID, ACTIVE, EXPIRED

    if (orderStatus === "PAID") {
      // Final confirmation: Update Org to Professional if payment is successful
      await OrganizationModel.findByIdAndUpdate(orgId, {
        billingPlan: "professional",
        isActive: true, // Corrected from 'status' to 'isActive'
        "settings.aiAssistantEnabled": true,
        "settings.maxClients": 250,
        "settings.maxRmSeats": 5,
      });

      logger.info(`${SERVICE_NAME}_PAYMENT_VERIFIED - ${orgId} : Order ${orderId}`);
      response.json({ success: true, status: "PAID" });
    } else {
      response.json({ success: false, status: orderStatus, message: "Payment not completed" });
    }
  } catch (error) {
    next(error);
  }
}
