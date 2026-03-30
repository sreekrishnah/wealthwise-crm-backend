

import type { Request, Response, NextFunction } from "express";
import { getReviews, createReview, updateReview } from "../services/review.service.js";
import { logAuditEvent } from "../services/audit.service.js";

export async function handleGetReviews(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const { status, page, limit } = request.query;

    const reviewsResult = await getReviews(orgId, {
      status: status as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
    });

    response.json(reviewsResult);
  } catch (error) {
    next(error);
  }
}

export async function handleCreateReview(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const createResult = await createReview(orgId, {
      ...request.body,
      rmId: request.user!.userId,
      rmName: request.user!.name,
    });

    if (createResult.success) {
      await logAuditEvent({
        orgId,
        userId: request.user!.userId,
        action: "REVIEW_CREATED",
        resourceType: "review",
        resourceId: createResult.data!._id.toString(),
        ipAddress: request.ip,
      });
    }

    response.status(201).json(createResult);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateReview(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const updateResult = await updateReview(orgId, (request.params.id as string), request.body);

    if (!updateResult.success) {
      response.status(updateResult.code || 400).json(updateResult);
      return;
    }

    await logAuditEvent({
      orgId,
      userId: request.user!.userId,
      action: "REVIEW_UPDATED",
      resourceType: "review",
      resourceId: (request.params.id as string),
      details: { updatedFields: Object.keys(request.body) },
      ipAddress: request.ip,
    });

    response.json(updateResult);
  } catch (error) {
    next(error);
  }
}
