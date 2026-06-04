import { GameSocket, IncomingMessagePayload } from '../../types/websocket';
import { RequestTrace } from '../types';

export interface GameActionHandler<TPayload extends IncomingMessagePayload> {
  handle(ws: GameSocket, payload: TPayload): Promise<object>;
  onSuccess?(
    ws: GameSocket,
    payload: TPayload,
    response: object,
    trace: RequestTrace
  ): Promise<void>;
}
