import threading
import time
from collections import defaultdict

from analytics.config import LOG_INTERVAL_SECONDS
from analytics.logger import log


class SpinAnalytics:
    def __init__(self):
        self.by_game = defaultdict(lambda: {"spins": 0, "betAmount": 0, "winAmount": 0})
        self.last_log_at = time.time()
        self.lock = threading.Lock()

    def record(self, event):
        if event.get("type") != "spin_completed":
            return

        payload = event.get("payload", {})
        game_id = payload.get("gameId", "unknown")

        with self.lock:
            stats = self.by_game[game_id]
            stats["spins"] += 1
            stats["betAmount"] += int(payload.get("betAmount", 0))
            stats["winAmount"] += int(payload.get("winAmount", 0))

    def snapshot(self):
        with self.lock:
            return {
                game_id: dict(stats)
                for game_id, stats in self.by_game.items()
            }

    def log_if_due(self):
        now = time.time()

        if now - self.last_log_at < LOG_INTERVAL_SECONDS:
            return

        self.last_log_at = now
        log("analytics_snapshot", games=self.snapshot())
