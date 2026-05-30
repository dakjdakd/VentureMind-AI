from __future__ import annotations

import asyncio
from collections import defaultdict

from app.schemas import StreamEvent


class EventBus:
    def __init__(self) -> None:
        self._queues: dict[str, set[asyncio.Queue[StreamEvent]]] = defaultdict(set)

    async def subscribe(self, analysis_id: str) -> asyncio.Queue[StreamEvent]:
        queue: asyncio.Queue[StreamEvent] = asyncio.Queue()
        self._queues[analysis_id].add(queue)
        return queue

    def unsubscribe(self, analysis_id: str, queue: asyncio.Queue[StreamEvent]) -> None:
        queues = self._queues.get(analysis_id)
        if not queues:
            return
        queues.discard(queue)
        if not queues:
            self._queues.pop(analysis_id, None)

    async def publish(self, analysis_id: str, event: StreamEvent) -> None:
        for queue in list(self._queues.get(analysis_id, set())):
            await queue.put(event)


event_bus = EventBus()

