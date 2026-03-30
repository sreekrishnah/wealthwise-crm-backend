

import mongoose, { Schema, type Document } from "mongoose";

export interface AumSnapshotDocument extends Document {
  orgId: mongoose.Types.ObjectId;
  month: string;
  year: number;
  totalAum: number;
  inflow: number;
  outflow: number;
  clientCount: number;
  createdAt: Date;
}

const aumSnapshotSchema = new Schema<AumSnapshotDocument>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    totalAum: { type: Number, required: true, min: 0 },
    inflow: { type: Number, default: 0 },
    outflow: { type: Number, default: 0 },
    clientCount: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_document, returnedObject: any) {
        returnedObject.id = returnedObject._id;
        returnedObject._id = undefined;
        returnedObject.__v = undefined;
      },
    },
  }
);

aumSnapshotSchema.index({ orgId: 1, year: 1, month: 1 }, { unique: true });

export const AumSnapshotModel = mongoose.model<AumSnapshotDocument>("AumSnapshot", aumSnapshotSchema);
