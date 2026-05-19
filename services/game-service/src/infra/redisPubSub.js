const { createClient } = require('redis');

class RedisPubSub {
  constructor({ url, channel }) {
    this.url = url;
    this.channel = channel;
    this.publisher = createClient({ url });
    this.subscriber = this.publisher.duplicate();
  }

  async connect(onMessage) {
    this.publisher.on('error', (err) => console.error('redis publisher error', err.message));
    this.subscriber.on('error', (err) => console.error('redis subscriber error', err.message));

    await this.publisher.connect();
    await this.subscriber.connect();
    await this.subscriber.subscribe(this.channel, (message) => this.handleMessage(message, onMessage));

    console.log(`redis pubsub connected on ${this.channel}`);
  }

  async publish(payload) {
    await this.publisher.publish(this.channel, JSON.stringify(payload));
  }

  async close() {
    await Promise.allSettled([
      this.subscriber.quit(),
      this.publisher.quit()
    ]);
  }

  handleMessage(message, onMessage) {
    try {
      onMessage(JSON.parse(message));
    } catch (err) {
      console.error('redis message parse error', err.message);
    }
  }
}

module.exports = RedisPubSub;
