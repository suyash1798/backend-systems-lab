import { startHostedGame } from '@trying-sd/game-host';
import SlotRuntime from './Runtime';
import { validateMessage } from './validateMessage';

startHostedGame(new SlotRuntime(), validateMessage);
