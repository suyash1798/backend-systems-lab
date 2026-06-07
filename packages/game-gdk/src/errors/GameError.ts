class GameError extends Error {
  readonly status: number;
  readonly detail: unknown;
  readonly source: string;

  constructor(message: string, status = 500, detail: unknown = null, source = 'game-gdk') {
    super(message);
    this.status = status;
    this.detail = detail;
    this.source = source;
  }
}

export default GameError;
