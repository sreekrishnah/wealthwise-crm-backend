

import mongoose, { Schema, type Document } from "mongoose";
import { ComplianceStatus, ComplianceType } from "../domain/enums/index.js";

export interface ComplianceTaskDocument extends Document {
  orgId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  clientName: string;
  type: ComplianceType;
  dueDate: Date;
  status: ComplianceStatus;
  completedAt: Date | null;
  assignedToId: mongoose.Types.ObjectId | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const complianceTaskSchema = new Schema<ComplianceTaskDocument>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    clientName: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(ComplianceType), required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(ComplianceStatus), default: ComplianceStatus.PENDING },
    completedAt: { type: Date, default: null },
    assignedToId: { type: Schema.Types.ObjectId, ref: "User", default: null },
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

complianceTaskSchema.index({ orgId: 1, status: 1 });
complianceTaskSchema.index({ orgId: 1, dueDate: 1 });
complianceTaskSchema.index({ orgId: 1, clientId: 1, type: 1 });

export const ComplianceTaskModel = mongoose.model<ComplianceTaskDocument>("ComplianceTask", complianceTaskSchema);
