import {
  IncomingMessagePayload,
  ValidateMessage
} from '@trying-sd/game-gdk';
import GameServiceHost from './GameServiceHost';
import startGameService, { GameServiceRuntime } from './startGameService';

function startHostedGame<TPayload extends IncomingMessagePayload>(
  runtime: GameServiceRuntime<TPayload>,
  validateMessage: ValidateMessage<TPayload>
): GameServiceHost<TPayload> {
  return startGameService({
    runtime,
    validateMessage
  });
}

export default startHostedGame;
