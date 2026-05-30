from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Awaitable

from app.schemas import (
    AgentId,
    AgentResult,
    AgentStage,
    AgentStatus,
    AnalysisJob,
    AnalysisRequest,
    AnalysisStatus,
    CriticResult,
    FinalReport,
    LogEvent,
    LogType,
    StreamEvent,
    default_agent_stages,
    utc_now,
)
from app.services.stream import event_bus


class AnalysisStore:
    def __init__(self) -> None:
        self._jobs: dict[str, AnalysisJob] = {}
        self._lock = asyncio.Lock()

    async def create(self, request: AnalysisRequest) -> AnalysisJob:
        job = AnalysisJob(
            idea=request.idea.strip(),
            context=request.context,
            constraints=request.constraints,
            agents=default_agent_stages(),
        )
        async with self._lock:
            self._jobs[job.id] = job
        await self.log(job.id, "Analysis job queued.", LogType.INFO)
        return job

    async def get(self, analysis_id: str) -> AnalysisJob | None:
        async with self._lock:
            return self._jobs.get(analysis_id)

    async def mutate(self, analysis_id: str, mutator: Callable[[AnalysisJob], None]) -> AnalysisJob:
        async with self._lock:
            job = self._jobs[analysis_id]
            mutator(job)
            job.updated_at = utc_now()
            return job

    async def set_status(self, analysis_id: str, status: AnalysisStatus, phase: str) -> None:
        job = await self.mutate(analysis_id, lambda j: (setattr(j, "status", status), setattr(j, "phase", phase)))
        await event_bus.publish(analysis_id, StreamEvent(event="status", data=job.model_dump(mode="json", by_alias=True)))

    async def set_agent(self, analysis_id: str, agent: AgentId, status: AgentStatus, current_task: str | None = None) -> None:
        def update(job: AnalysisJob) -> None:
            stage = job.agents[agent]
            stage.status = status
            stage.current_task = current_task
            if status == AgentStatus.RUNNING:
                stage.started_at = utc_now()
            if status in {AgentStatus.COMPLETED, AgentStatus.WARNING, AgentStatus.ERROR}:
                stage.completed_at = utc_now()

        job = await self.mutate(analysis_id, update)
        await event_bus.publish(analysis_id, StreamEvent(event="agent", data=job.agents[agent].model_dump(mode="json", by_alias=True)))

    async def save_result(self, analysis_id: str, result: AgentResult) -> None:
        def update(job: AnalysisJob) -> None:
            job.results[result.agent] = result
            if isinstance(result, CriticResult):
                job.critic = result

        await self.mutate(analysis_id, update)
        await event_bus.publish(analysis_id, StreamEvent(event="result", data=result.model_dump(mode="json", by_alias=True)))

    async def save_report(self, analysis_id: str, report: FinalReport) -> None:
        job = await self.mutate(analysis_id, lambda j: setattr(j, "final_report", report))
        await event_bus.publish(analysis_id, StreamEvent(event="report", data=job.model_dump(mode="json", by_alias=True)))

    async def increment_reflection(self, analysis_id: str) -> None:
        await self.mutate(analysis_id, lambda j: setattr(j, "reflection_loops", j.reflection_loops + 1))

    async def fail(self, analysis_id: str, error: str) -> None:
        def update(job: AnalysisJob) -> None:
            job.status = AnalysisStatus.FAILED
            job.phase = "failed"
            job.error = error

        job = await self.mutate(analysis_id, update)
        await self.log(analysis_id, error, LogType.ERROR)
        await event_bus.publish(analysis_id, StreamEvent(event="status", data=job.model_dump(mode="json", by_alias=True)))

    async def log(self, analysis_id: str, message: str, log_type: LogType = LogType.INFO, agent: AgentId | None = None) -> None:
        event = LogEvent(message=message, type=log_type, agent=agent)

        def update(job: AnalysisJob) -> None:
            job.logs.append(event)

        await self.mutate(analysis_id, update)
        await event_bus.publish(analysis_id, StreamEvent(event="log", data=event.model_dump(mode="json", by_alias=True)))


store = AnalysisStore()

