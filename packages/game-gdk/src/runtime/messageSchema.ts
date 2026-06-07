import { z } from 'zod';
import { IncomingMessagePayload } from '../types';

export const joinSchema = z.object({
  action: z.literal('join'),
  requestId: z.string().min(1),
  roomId: z.string().min(1),
  token: z.string().min(1)
});

export const endRoundSchema = z.object({
  action: z.literal('end_round'),
  requestId: z.string().min(1)
});

export const persistentDataSchema = z.object({
  action: z.literal('persistent_data'),
  requestId: z.string().min(1),
  gameId: z.string().min(1),
  data: z.record(z.string(), z.unknown())
});

const defaultSchemas = [
  joinSchema,
  endRoundSchema,
  persistentDataSchema
] as const;

export function createMessageValidator<TPayload extends IncomingMessagePayload>(
  featureSchemas: readonly [z.ZodType, ...z.ZodType[]]
): (payload: unknown) => TPayload {
  const schemas = [
    ...defaultSchemas,
    ...featureSchemas
  ];
  const messageSchema = z.discriminatedUnion('action', schemas as any);

  return (payload: unknown) => messageSchema.parse(payload) as TPayload;
}
