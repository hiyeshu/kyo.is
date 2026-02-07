import { type UIMessage } from "@ai-sdk/react";

// Message metadata for AI chat
export interface MessageMetadata extends Record<string, unknown> {
  createdAt: Date;
}

// AI chat message type with metadata
export type AIChatMessage = UIMessage<MessageMetadata>;
