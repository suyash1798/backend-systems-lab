import json
import time


def log(event: str, **fields):
    print(json.dumps({
        "event": event,
        "service": "analytics-service",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        **fields,
    }), flush=True)
