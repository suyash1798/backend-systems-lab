class EventBus {
  constructor({ pubSub = null, serverId }) {
    this.pubSub = pubSub;
    this.serverId = serverId;
    this.handlers = [];
  }

  async start() {
    if (!this.pubSub) {
      return;
    }

    await this.pubSub.connect((event) => this.emit(event));
  }

  subscribe(handler) {
    this.handlers.push(handler);
  }

  async publish(event) {
    const enrichedEvent = {
      ...event,
      serverId: this.serverId,
      timestamp: new Date().toISOString()
    };

    if (!this.pubSub) {
      this.emit(enrichedEvent);
      return;
    }

    try {
      await this.pubSub.publish(enrichedEvent);
    } catch (err) {
      console.error('event publish error', err.message);
    }
  }

  emit(event) {
    this.handlers.forEach((handler) => handler(event));
  }

  async stop() {
    if (this.pubSub) {
      await this.pubSub.close();
    }
  }
}

module.exports = EventBus;
