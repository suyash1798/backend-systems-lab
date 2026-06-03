from analytics.config import KAFKA_BROKERS, KAFKA_TOPIC
from analytics.http_server import start_http_server
from analytics.kafka_consumer import wait_for_consumer
from analytics.logger import log
from analytics.spin_analytics import SpinAnalytics


def main():
    analytics = SpinAnalytics()
    start_http_server(analytics)
    consumer = wait_for_consumer()

    log("analytics_started", topic=KAFKA_TOPIC, brokers=KAFKA_BROKERS)

    for message in consumer:
        analytics.record(message.value)
        analytics.log_if_due()


if __name__ == "__main__":
    main()
