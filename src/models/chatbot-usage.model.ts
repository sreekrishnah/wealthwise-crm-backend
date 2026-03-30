

import mongoose, { Schema, type Document } from "mongoose";

export interface ChatbotUsageDocument extends Document {
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  hourlyUsage: Map<string, number>;
  dailyMessageCount: number;
  dailyTokenCount: number;
  dailyCostEstimate: number;
  modelUsage: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const chatbotUsageSchema = new Schema<ChatbotUsageDocument>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    // WHY: Hourly bucketing enables granular rate limiting without scanning message logs
    hourlyUsage: { type: Map, of: Number, default: {} },
    dailyMessageCount: { type: Number, default: 0 },
    dailyTokenCount: { type: Number, default: 0 },
    dailyCostEstimate: { type: Number, default: 0 },
    modelUsage: { type: Map, of: Number, default: {} },
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

chatbotUsageSchema.index({ orgId: 1, userId: 1, date: 1 }, { unique: true });

export const ChatbotUsageModel = mongoose.model<ChatbotUsageDocument>("ChatbotUsage", chatbotUsageSchema);
