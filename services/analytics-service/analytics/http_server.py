import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from analytics.config import HTTP_PORT, KAFKA_TOPIC
from analytics.logger import log


class AnalyticsHttpHandler(BaseHTTPRequestHandler):
    analytics = None

    def do_GET(self):
        if self.path == "/":
            self.respond({"status": "ok", "service": "analytics-service"})
            return

        if self.path == "/stats":
            self.respond({
                "service": "analytics-service",
                "topic": KAFKA_TOPIC,
                "games": self.analytics.snapshot(),
            })
            return

        self.respond({"error": "not found"}, status=404)

    def log_message(self, format, *args):
        return

    def respond(self, body, status=200):
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def start_http_server(analytics):
    AnalyticsHttpHandler.analytics = analytics
    server = ThreadingHTTPServer(("0.0.0.0", HTTP_PORT), AnalyticsHttpHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    log("analytics_http_started", port=HTTP_PORT)
