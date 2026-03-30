

import { ReviewModel, type ReviewDocument } from "../models/review.model.js";
import { logger } from "../utils/logger.js";
import type { ServiceResult, PaginatedResult } from "../domain/interfaces/index.js";

const SERVICE_NAME = "REVIEW_SERVICE";

export async function getReviews(
  orgId: string,
  options: { status?: string; rmId?: string; clientId?: string; page: number; limit: number }
): Promise<ServiceResult<PaginatedResult<ReviewDocument>>> {
  logger.info(`${SERVICE_NAME}_FETCHING_REVIEWS - ORG : ${orgId}`);

  const queryFilter: Record<string, unknown> = { orgId };
  if (options.status) queryFilter.status = options.status;
  if (options.rmId) queryFilter.rmId = options.rmId;
  if (options.clientId) queryFilter.clientId = options.clientId;

  const skipCount = (options.page - 1) * options.limit;

  const [reviewList, totalCount] = await Promise.all([
    ReviewModel.find(queryFilter).sort({ date: -1 }).skip(skipCount).limit(options.limit).lean(),
    ReviewModel.countDocuments(queryFilter),
  ]);

  const totalPages = Math.ceil(totalCount / options.limit);

  return {
    success: true,
    data: {
      data: reviewList as any,
      total: totalCount,
      page: options.page,
      totalPages,
      hasNextPage: options.page < totalPages,
    },
  };
}

export async function createReview(
  orgId: string,
  reviewData: Partial<ReviewDocument>
): Promise<ServiceResult<ReviewDocument>> {
  logger.info(`${SERVICE_NAME}_CREATING_REVIEW - ORG : ${orgId}`);

  const createdReview = await ReviewModel.create({ ...reviewData, orgId });

  logger.info(`${SERVICE_NAME}_REVIEW_CREATED - ${createdReview._id}`);
  return { success: true, data: createdReview };
}

export async function updateReview(
  orgId: string,
  reviewId: string,
  updateData: Partial<ReviewDocument>
): Promise<ServiceResult<ReviewDocument>> {
  logger.info(`${SERVICE_NAME}_UPDATING_REVIEW - ${reviewId}`);

  const updatedReview = await ReviewModel.findOneAndUpdate(
    { _id: reviewId, orgId },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!updatedReview) {
    return { success: false, error: "Review not found.", code: 404 };
  }

  return { success: true, data: updatedReview };
}

export async function getUpcomingReviews(
  orgId: string,
  limitCount: number = 5
): Promise<ServiceResult<ReviewDocument[]>> {
  logger.info(`${SERVICE_NAME}_FETCHING_UPCOMING - ORG : ${orgId}`);

  const upcomingReviews = await ReviewModel.find({
    orgId,
    status: "scheduled",
    date: { $gte: new Date() },
  })
    .sort({ date: 1 })
    .limit(limitCount)
    .lean();

  return { success: true, data: upcomingReviews as any };
}
