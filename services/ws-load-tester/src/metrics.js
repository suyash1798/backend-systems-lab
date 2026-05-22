class Metrics {
  constructor({ config, activeConnections, pendingSize }) {
    this.config = config;
    this.activeConnections = activeConnections;
    this.pendingSize = pendingSize;
    this.startedAt = Date.now();
    this.latencies = [];
    this.stats = {
      opened: 0,
      closed: 0,
      connectionErrors: 0,
      lastConnectionError: null,
      sent: 0,
      received: 0,
      notifications: 0,
      ok: 0,
      appErrors: 0,
      timeouts: 0,
      totalLatencyMs: 0,
      minLatencyMs: Infinity,
      maxLatencyMs: 0
    };
    this.lastSnapshot = this.snapshot();
  }

  snapshot() {
    return {
      at: Date.now(),
      sent: this.stats.sent,
      received: this.stats.received,
      ok: this.stats.ok,
      appErrors: this.stats.appErrors,
      timeouts: this.stats.timeouts,
      notifications: this.stats.notifications
    };
  }

  recordLatency(latencyMs) {
    this.latencies.push(latencyMs);
    this.stats.totalLatencyMs += latencyMs;
    this.stats.minLatencyMs = Math.min(this.stats.minLatencyMs, latencyMs);
    this.stats.maxLatencyMs = Math.max(this.stats.maxLatencyMs, latencyMs);
  }

  percentile(p) {
    if (this.latencies.length === 0) {
      return 0;
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  rates() {
    const current = this.snapshot();
    const seconds = Math.max((current.at - this.lastSnapshot.at) / 1000, 1);
    const result = {
      sentPerSec: Math.round((current.sent - this.lastSnapshot.sent) / seconds),
      receivedPerSec: Math.round((current.received - this.lastSnapshot.received) / seconds),
      okPerSec: Math.round((current.ok - this.lastSnapshot.ok) / seconds),
      appErrorsPerSec: Math.round((current.appErrors - this.lastSnapshot.appErrors) / seconds),
      timeoutsPerSec: Math.round((current.timeouts - this.lastSnapshot.timeouts) / seconds),
      notificationsPerSec: Math.round((current.notifications - this.lastSnapshot.notifications) / seconds)
    };

    this.lastSnapshot = current;
    return result;
  }

  printConfig() {
    console.log(JSON.stringify({
      event: 'load-test-started',
      targetUrl: this.config.targetUrl,
      action: this.config.action,
      connections: this.config.connections,
      rooms: this.config.rooms,
      rampUpMs: this.config.rampUpMs,
      durationMs: this.config.durationMs,
      messageIntervalMs: this.config.messageIntervalMs,
      logIntervalMs: this.config.logIntervalMs,
      requestTimeoutMs: this.config.requestTimeoutMs,
      joinOnOpen: this.config.joinOnOpen,
      userIdPrefix: this.config.userIdPrefix,
      roomIdPrefix: this.config.roomIdPrefix,
      mode: this.config.durationMs === 0 ? 'infinite' : 'timed'
    }));
  }

  printStats(final = false, reason = null) {
    const measured = this.stats.ok + this.stats.appErrors;
    const avgLatencyMs = measured > 0 ? Math.round(this.stats.totalLatencyMs / measured) : 0;
    const minLatencyMs = this.stats.minLatencyMs === Infinity ? 0 : this.stats.minLatencyMs;

    console.log(JSON.stringify({
      final,
      reason,
      targetUrl: this.config.targetUrl,
      action: this.config.action,
      configuredConnections: this.config.connections,
      activeConnections: this.activeConnections(),
      elapsedMs: Date.now() - this.startedAt,
      pending: this.pendingSize(),
      rates: final ? null : this.rates(),
      ...this.stats,
      minLatencyMs,
      avgLatencyMs,
      p50LatencyMs: this.percentile(50),
      p95LatencyMs: this.percentile(95),
      p99LatencyMs: this.percentile(99),
      maxLatencyMs: this.stats.maxLatencyMs
    }));
  }
}

module.exports = Metrics;
