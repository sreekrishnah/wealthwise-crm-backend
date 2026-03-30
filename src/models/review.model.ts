

import mongoose, { Schema, type Document } from "mongoose";
import { ReviewStatus } from "../domain/enums/index.js";

export interface ReviewDocument extends Document {
  orgId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  clientName: string;
  rmId: mongoose.Types.ObjectId;
  rmName: string;
  date: Date;
  status: ReviewStatus;
  notes: string;
  outcome: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    clientName: { type: String, required: true, trim: true },
    rmId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rmName: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    status: { type: String, enum: Object.values(ReviewStatus), default: ReviewStatus.SCHEDULED },
    notes: { type: String, default: "", trim: true },
    outcome: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returnedObject: any) {
        returnedObject.id = returnedObject._id;
        returnedObject._id = undefined;
        returnedObject.__v = undefined;
      },
    },
  }
);

reviewSchema.index({ orgId: 1, date: 1 });
reviewSchema.index({ orgId: 1, status: 1 });
reviewSchema.index({ orgId: 1, rmId: 1, date: 1 });

export const ReviewModel = mongoose.model<ReviewDocument>("Review", reviewSchema);
