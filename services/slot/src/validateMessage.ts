import { createMessageValidator } from '@trying-sd/game-gdk';
import { spinSchema } from './slot/messageSchema';
import { IncomingMessagePayload } from './contracts';

export const validateMessage = createMessageValidator<IncomingMessagePayload>([spinSchema]);
