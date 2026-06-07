class AppError extends Error {
  public readonly status: number;
  public readonly detail: unknown;
  public readonly source: string;

  constructor(message: string, status = 500, detail: unknown = null, source = 'service') {
    super(message);

    this.status = status;
    this.detail = detail;
    this.source = source;
  }
}

export default AppError;
