

import mongoose, { Schema, type Document } from "mongoose";
import { GoalStatus } from "../domain/enums/index.js";

export interface GoalDocument extends Document {
  orgId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  clientName: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  status: GoalStatus;
  deadline: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<GoalDocument>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    clientName: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 0 },
    currentAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(GoalStatus), default: GoalStatus.ON_TRACK },
    deadline: { type: Date, required: true },
    notes: { type: String, default: "", trim: true },
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

goalSchema.index({ orgId: 1, clientId: 1 });
goalSchema.index({ orgId: 1, status: 1 });

export const GoalModel = mongoose.model<GoalDocument>("Goal", goalSchema);
