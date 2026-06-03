import os


KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "kafka:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "game-events")
GROUP_ID = os.getenv("KAFKA_GROUP_ID", "analytics-service")
LOG_INTERVAL_SECONDS = int(os.getenv("LOG_INTERVAL_SECONDS", "10"))
HTTP_PORT = int(os.getenv("PORT", "9000"))
