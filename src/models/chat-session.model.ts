

import mongoose, { Schema, type Document } from "mongoose";
import { ChatMessageRole } from "../domain/enums/index.js";

export interface ChatMessageEntry {
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
    result: string;
  }>;
}

export interface ChatSessionDocument extends Document {
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userRole: string;
  messages: ChatMessageEntry[];
  activeClientId: mongoose.Types.ObjectId | null;
  metadata: {
    totalTokensUsed: number;
    lastModelUsed: string;
    intentHistory: string[];
  };
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageEntrySchema = new Schema<ChatMessageEntry>(
  {
    role: { type: String, enum: Object.values(ChatMessageRole), required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    toolCalls: {
      type: [
        {
          toolName: { type: String },
          arguments: { type: Schema.Types.Mixed },
          result: { type: String },
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

const chatSessionSchema = new Schema<ChatSessionDocument>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userRole: { type: String, required: true },
    messages: {
      type: [chatMessageEntrySchema],
      validate: {
        // WHY: Rolling window prevents unbounded memory growth — max 50 messages per session
        validator: (messageArray: ChatMessageEntry[]) => messageArray.length <= 50,
        message: "Chat session cannot exceed 50 messages. Start a new session.",
      },
    },
    activeClientId: { type: Schema.Types.ObjectId, ref: "Client", default: null },
    metadata: {
      totalTokensUsed: { type: Number, default: 0 },
      lastModelUsed: { type: String, default: "" },
      intentHistory: { type: [String], default: [] },
    },
    isActive: { type: Boolean, default: true },
    // WHY: 24-hour TTL — sessions are ephemeral CRM interaction contexts, not permanent records
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expires: 0 },
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

chatSessionSchema.index({ orgId: 1, userId: 1, isActive: 1 });

export const ChatSessionModel = mongoose.model<ChatSessionDocument>("ChatSession", chatSessionSchema);
