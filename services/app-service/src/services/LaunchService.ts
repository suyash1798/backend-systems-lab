import config from '../config';
import HttpClient from '../clients/HttpClient';

interface DeviceIdentity {
  playerId: string;
  accessToken: string;
}

interface RoomAssignment {
  roomId: string;
  gameId: string;
  status: string;
  capacity: number;
  playerCount: number;
  players: string[];
}

class LaunchService {
  constructor(private readonly http = new HttpClient()) {}

  async launch(gameId: string, deviceId: string): Promise<object> {
    const identity = await this.createIdentity(deviceId);
    const room = await this.loadRoom(gameId, identity.accessToken);

    return {
      playerId: identity.playerId,
      accessToken: identity.accessToken,
      room,
      websocketUrl: config.websocketUrl
    };
  }

  private createIdentity(deviceId: string): Promise<DeviceIdentity> {
    return this.http.post<DeviceIdentity>(
      `${config.userServiceUrl}/devices`,
      { deviceId }
    );
  }

  private loadRoom(gameId: string, token: string): Promise<RoomAssignment> {
    return this.http.post<RoomAssignment>(
      `${config.lobbyServiceUrl}/games/${gameId}/load`,
      undefined,
      { Authorization: `Bearer ${token}` }
    );
  }
}

export default LaunchService;
