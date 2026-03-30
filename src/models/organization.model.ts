

import mongoose, { Schema, type Document } from "mongoose";

export interface OrganizationDocument extends Document {
  name: string;
  sebiRegistrationNumber: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  billingPlan: string;
  billingCycleStart: Date;
  isActive: boolean;
  settings: {
    maxClients: number;
    maxRmSeats: number;
    aiAssistantEnabled: boolean;
    customPipelineStages: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<OrganizationDocument>(
  {
    name: { type: String, required: true, trim: true },
    sebiRegistrationNumber: { type: String, required: true, unique: true, trim: true },
    address: { type: String, default: "" },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    billingPlan: { type: String, enum: ["starter", "professional", "enterprise"], default: "starter" },
    billingCycleStart: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    settings: {
      maxClients: { type: Number, default: 50 },
      maxRmSeats: { type: Number, default: 1 },
      aiAssistantEnabled: { type: Boolean, default: false },
      customPipelineStages: { type: [String], default: [] },
    },
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

export const OrganizationModel = mongoose.model<OrganizationDocument>("Organization", organizationSchema);
