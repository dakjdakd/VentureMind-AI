from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse

from app.core.orchestrator import orchestrator
from app.schemas import AnalysisRequest, CreateAnalysisResponse, StreamEvent
from app.services.store import store
from app.services.stream import event_bus

router = APIRouter(prefix="/api")


@router.post("/analyses", response_model=CreateAnalysisResponse, response_model_by_alias=True)
async def create_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks) -> CreateAnalysisResponse:
    job = await store.create(request)
    background_tasks.add_task(orchestrator.run_analysis, job.id)
    return CreateAnalysisResponse(analysisId=job.id, status=job.status, streamUrl=f"/api/analyses/{job.id}/stream")


@router.get("/analyses/{analysis_id}")
async def get_analysis(analysis_id: str):
    job = await store.get(analysis_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return job.model_dump(mode="json", by_alias=True)


@router.get("/analyses/{analysis_id}/stream")
async def stream_analysis(analysis_id: str) -> StreamingResponse:
    job = await store.get(analysis_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis not found")

    async def event_generator():
        snapshot = StreamEvent(event="snapshot", data=job.model_dump(mode="json", by_alias=True))
        yield _format_sse(snapshot)
        queue = await event_bus.subscribe(analysis_id)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15)
                    yield _format_sse(event)
                    if event.event == "status" and event.data.get("status") in {"completed", "failed"}:
                        break
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        finally:
            event_bus.unsubscribe(analysis_id, queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def _format_sse(event: StreamEvent) -> str:
    return f"event: {event.event}\ndata: {json.dumps(event.data, ensure_ascii=False)}\n\n"

