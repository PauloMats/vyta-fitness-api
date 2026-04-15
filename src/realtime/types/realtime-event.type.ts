export const realtimeChannels = ['notifications', 'messages', 'support'] as const;

export type RealtimeChannel = (typeof realtimeChannels)[number];

export type RealtimeEventPayload = {
  channel: RealtimeChannel;
  event: string;
  data?: Record<string, unknown>;
  occurredAt: string;
};
