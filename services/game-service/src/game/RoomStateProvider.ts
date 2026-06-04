export interface RoomStateProvider {
  key: string;
  state(userId: string, roomId: string): Promise<unknown>;
}
