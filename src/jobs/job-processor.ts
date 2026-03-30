

import { Queue, Worker } from "bullmq";
import { getRedisClient } from "../config/redis.js";
import { ComplianceTaskModel } from "../models/compliance-task.model.js";
import { ReviewModel } from "../models/review.model.js";
import { emitComplianceAlert, emitReviewReminder } from "../socket/socket-handler.js";
import { logger } from "../utils/logger.js";
import { ComplianceStatus, ReviewStatus } from "../domain/enums/index.js";

const SERVICE_NAME = "JOB_PROCESSOR";

let complianceQueue: Queue | null = null;
let reviewQueue: Queue | null = null;

export function initializeJobQueues(): void {
  const redisConnection = getRedisClient();
  const connectionConfig: any = { connection: redisConnection };

  // Compliance check queue — runs daily to update overdue statuses
  complianceQueue = new Queue("compliance-check", connectionConfig);
  reviewQueue = new Queue("review-reminders", connectionConfig);

  const complianceWorker = new Worker(
    "compliance-check",
    async () => {
      logger.info(`${SERVICE_NAME}_COMPLIANCE_CHECK_STARTED - JOB : compliance-check`);

      const now = new Date();
      const overdueResult = await ComplianceTaskModel.updateMany(
        {
          status: ComplianceStatus.PENDING,
          dueDate: { $lt: now },
        },
        { $set: { status: ComplianceStatus.OVERDUE } }
      );

      logger.info(
        `${SERVICE_NAME}_COMPLIANCE_CHECK_COMPLETED - UPDATED : ${overdueResult.modifiedCount} tasks marked overdue`
      );

      if (overdueResult.modifiedCount > 0) {
        const overdueTasksList = await ComplianceTaskModel.find({ status: ComplianceStatus.OVERDUE }).lean();
        const orgIds = [...new Set(overdueTasksList.map((task) => task.orgId.toString()))];

        for (const orgId of orgIds) {
          emitComplianceAlert(orgId, {
            type: "compliance_overdue",
            count: overdueTasksList.filter((task) => task.orgId.toString() === orgId).length,
            timestamp: new Date(),
          });
        }
      }
    },
    connectionConfig
  );

  const reviewWorker = new Worker(
    "review-reminders",
    async () => {
      logger.info(`${SERVICE_NAME}_REVIEW_REMINDER_STARTED - JOB : review-reminders`);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingReviews = await ReviewModel.find({
        status: ReviewStatus.SCHEDULED,
        date: { $gte: today, $lte: tomorrow },
      }).lean();

      for (const review of upcomingReviews) {
        emitReviewReminder(review.rmId.toString(), {
          type: "review_reminder",
          clientName: review.clientName,
          date: review.date,
          reviewId: review._id.toString(),
        });
      }

      // WHY: Auto-mark missed reviews — reviews with past dates that are still "scheduled"
      const missedResult = await ReviewModel.updateMany(
        {
          status: ReviewStatus.SCHEDULED,
          date: { $lt: today },
        },
        { $set: { status: ReviewStatus.MISSED } }
      );

      logger.info(
        `${SERVICE_NAME}_REVIEW_REMINDER_COMPLETED - REMINDERS : ${upcomingReviews.length}, MISSED : ${missedResult.modifiedCount}`
      );
    },
    connectionConfig
  );

  complianceWorker.on("failed", (job, failureError) => {
    logger.error(`${SERVICE_NAME}_JOB_FAILED - QUEUE : compliance-check : ${failureError.message}`);
  });

  reviewWorker.on("failed", (job, failureError) => {
    logger.error(`${SERVICE_NAME}_JOB_FAILED - QUEUE : review-reminders : ${failureError.message}`);
  });

  logger.info(`${SERVICE_NAME}_QUEUES_INITIALIZED - WORKERS : compliance-check, review-reminders`);
}

export async function scheduleRecurringJobs(): Promise<void> {
  if (!complianceQueue || !reviewQueue) {
    logger.error(`${SERVICE_NAME}_SCHEDULING_FAILED - queues not initialized`);
    return;
  }

  await complianceQueue.add("daily-compliance-check", {}, {
    repeat: { pattern: "0 8 * * *" },
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  await reviewQueue.add("daily-review-reminders", {}, {
    repeat: { pattern: "0 7 * * *" },
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  logger.info(`${SERVICE_NAME}_RECURRING_JOBS_SCHEDULED - compliance: 8AM daily, reviews: 7AM daily`);
}
