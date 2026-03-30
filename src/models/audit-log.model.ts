

import mongoose, { Schema, type Document } from "mongoose";

export interface AuditLogDocument extends Document {
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true, trim: true },
    resourceType: { type: String, required: true, trim: true },
    resourceId: { type: String, required: true, trim: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    toJSON: {
      transform(_document, returnedObject: any) {
        returnedObject.id = returnedObject._id;
        returnedObject._id = undefined;
        returnedObject.__v = undefined;
      },
    },
  }
);

auditLogSchema.index({ orgId: 1, timestamp: -1 });
auditLogSchema.index({ orgId: 1, resourceType: 1, action: 1 });

export const AuditLogModel = mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);
