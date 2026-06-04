import { z } from 'zod';

export const spinSchema = z.object({
  action: z.literal('spin'),
  requestId: z.string().min(1),
  gameId: z.string().min(1),
  spinId: z.string().min(1),
  betAmount: z.number().positive()
});
