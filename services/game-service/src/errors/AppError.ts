class AppError extends Error {
  constructor(
    message: string,
    readonly status = 500,
    readonly detail: unknown = null,
    readonly source = 'game-service'
  ) {
    super(message);
  }
}

export default AppError;
