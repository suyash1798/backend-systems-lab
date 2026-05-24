export function log(event: string, data: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({
    event,
    service: 'game-service',
    timestamp: new Date().toISOString(),
    ...data
  }));
}
