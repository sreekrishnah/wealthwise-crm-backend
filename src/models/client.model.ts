

import mongoose, { Schema, type Document } from "mongoose";
import {
  ClientSegment,
  RiskLevel,
  KycStatus,
  PipelineStage,
} from "../domain/enums/index.js";

export interface ClientDocument extends Document {
  orgId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  segment: ClientSegment;
  aum: number;
  riskScore: number;
  riskLevel: RiskLevel;
  kycStatus: KycStatus;
  rmId: mongoose.Types.ObjectId;
  rmName: string;
  nextReview: Date;
  pipelineStage: PipelineStage;
  joinedDate: Date;
  avatar: string;
  panNumber: string;
  aadhaarNumber: string;
  dateOfBirth: Date | null;
  address: string;
  nomineeDetails: {
    name: string;
    relationship: string;
    contactNumber: string;
  } | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<ClientDocument>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    segment: { type: String, enum: Object.values(ClientSegment), required: true },
    aum: { type: Number, required: true, default: 0, min: 0 },
    riskScore: { type: Number, required: true, default: 0, min: 0, max: 100 },
    riskLevel: { type: String, enum: Object.values(RiskLevel), required: true },
    kycStatus: { type: String, enum: Object.values(KycStatus), default: KycStatus.PENDING },
    rmId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rmName: { type: String, required: true, trim: true },
    nextReview: { type: Date, required: true },
    pipelineStage: { type: String, enum: Object.values(PipelineStage), default: PipelineStage.PROSPECT },
    joinedDate: { type: Date, required: true },
    avatar: { type: String, default: "" },
    panNumber: { type: String, default: "" },
    aadhaarNumber: { type: String, default: "" },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, default: "" },
    nomineeDetails: {
      type: {
        name: { type: String },
        relationship: { type: String },
        contactNumber: { type: String },
      },
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returnedObject: any) {
        returnedObject.id = returnedObject._id;
        returnedObject._id = undefined;
        returnedObject.__v = undefined;
        // WHY: PAN and Aadhaar are sensitive PII — mask in all JSON output
        if (returnedObject.panNumber) {
          returnedObject.panNumber = returnedObject.panNumber.replace(/^(.{2})(.*)(.{2})$/, "$1****$3");
        }
        if (returnedObject.aadhaarNumber) {
          returnedObject.aadhaarNumber = returnedObject.aadhaarNumber.replace(/^(.{4})(.*)(.{4})$/, "$1****$3");
        }
      },
    },
  }
);

clientSchema.index({ orgId: 1, segment: 1 });
clientSchema.index({ orgId: 1, rmId: 1 });
clientSchema.index({ orgId: 1, pipelineStage: 1 });
clientSchema.index({ orgId: 1, kycStatus: 1 });
clientSchema.index({ orgId: 1, riskLevel: 1 });
clientSchema.index({ orgId: 1, name: "text", email: "text" });

export const ClientModel = mongoose.model<ClientDocument>("Client", clientSchema);
