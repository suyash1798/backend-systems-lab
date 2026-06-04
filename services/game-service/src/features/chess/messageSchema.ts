import { z } from 'zod';

export const chessMoveSchema = z.object({
  action: z.literal('chess_move'),
  requestId: z.string().min(1),
  from: z.string().min(2),
  to: z.string().min(2),
  promotion: z.enum(['q', 'r', 'b', 'n']).optional()
});
