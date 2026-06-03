import json
import time

from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable

from analytics.config import GROUP_ID, KAFKA_BROKERS, KAFKA_TOPIC
from analytics.logger import log


def create_consumer():
    return KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=KAFKA_BROKERS.split(","),
        group_id=GROUP_ID,
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda value: json.loads(value.decode("utf-8")),
    )


def wait_for_consumer():
    while True:
        try:
            return create_consumer()
        except NoBrokersAvailable:
            log("kafka_unavailable", brokers=KAFKA_BROKERS)
            time.sleep(2)
