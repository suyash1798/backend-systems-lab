export type LogFn = (event: string, data?: Record<string, unknown>) => void;

export function createLogger(service: string): LogFn {
  return (event: string, data: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({
      event,
      service,
      timestamp: new Date().toISOString(),
      ...data
    }));
  };
}
