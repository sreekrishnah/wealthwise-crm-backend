

import mongoose, { Schema, type Document } from "mongoose";
import { HoldingType } from "../domain/enums/index.js";

export interface PortfolioHoldingDocument extends Document {
  orgId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  name: string;
  type: HoldingType;
  value: number;
  allocation: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
  units: number;
  purchaseDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const portfolioHoldingSchema = new Schema<PortfolioHoldingDocument>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(HoldingType), required: true },
    value: { type: Number, required: true, min: 0 },
    allocation: { type: Number, required: true, min: 0, max: 100 },
    costBasis: { type: Number, required: true, min: 0 },
    gainLoss: { type: Number, required: true },
    gainLossPercent: { type: Number, required: true },
    units: { type: Number, default: 0 },
    purchaseDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
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

portfolioHoldingSchema.index({ orgId: 1, clientId: 1 });
portfolioHoldingSchema.index({ orgId: 1, type: 1 });

export const PortfolioHoldingModel = mongoose.model<PortfolioHoldingDocument>("PortfolioHolding", portfolioHoldingSchema);
