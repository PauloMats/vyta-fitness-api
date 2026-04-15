import { Injectable, MessageEvent } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import {
  RealtimeChannel,
  RealtimeEventPayload,
  realtimeChannels,
} from './types/realtime-event.type';

type StreamSubscription = {
  id: string;
  channels: Set<RealtimeChannel>;
  push: (event: MessageEvent) => void;
};

@Injectable()
export class RealtimeService {
  private readonly subscriptions = new Map<string, Map<string, StreamSubscription>>();
  private readonly heartbeatIntervalMs = 25_000;

  createUserStream(userId: string, channels?: RealtimeChannel[]): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const subscriptionId = randomUUID();
      const allowedChannels = new Set(
        channels && channels.length > 0 ? channels : realtimeChannels,
      );
      const userSubscriptions =
        this.subscriptions.get(userId) ?? new Map<string, StreamSubscription>();

      userSubscriptions.set(subscriptionId, {
        id: subscriptionId,
        channels: allowedChannels,
        push: (event) => subscriber.next(event),
      });
      this.subscriptions.set(userId, userSubscriptions);

      subscriber.next(
        this.toSseEvent('connected', {
          channel: 'notifications',
          connectionId: subscriptionId,
          subscribedChannels: [...allowedChannels],
        }),
      );

      const heartbeat = setInterval(() => {
        subscriber.next(
          this.toSseEvent('heartbeat', {
            channel: 'notifications',
          }),
        );
      }, this.heartbeatIntervalMs);

      return () => {
        clearInterval(heartbeat);
        const current = this.subscriptions.get(userId);
        current?.delete(subscriptionId);
        if (current && current.size === 0) {
          this.subscriptions.delete(userId);
        }
      };
    });
  }

  publishToUser(userId: string, payload: Omit<RealtimeEventPayload, 'occurredAt'>) {
    const subscriptions = this.subscriptions.get(userId);
    if (!subscriptions?.size) {
      return;
    }

    const event = this.toSseEvent(payload.event, {
      ...payload,
      occurredAt: new Date().toISOString(),
    });

    for (const subscription of subscriptions.values()) {
      if (!subscription.channels.has(payload.channel)) {
        continue;
      }

      subscription.push(event);
    }
  }

  publishToUsers(userIds: string[], payload: Omit<RealtimeEventPayload, 'occurredAt'>) {
    for (const userId of new Set(userIds)) {
      this.publishToUser(userId, payload);
    }
  }

  private toSseEvent(
    type: string,
    payload: {
      channel: RealtimeChannel;
      occurredAt?: string;
      [key: string]: unknown;
    },
  ) {
    return {
      id: randomUUID(),
      type,
      retry: 15_000,
      data: {
        event: type,
        occurredAt: payload.occurredAt ?? new Date().toISOString(),
        ...payload,
      },
    } satisfies MessageEvent;
  }
}
