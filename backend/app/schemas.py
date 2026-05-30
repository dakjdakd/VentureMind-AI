from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field


class AnalysisStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentStatus(StrEnum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    WARNING = "warning"
    ERROR = "error"


class LogType(StrEnum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


class AgentId(StrEnum):
    RESEARCH = "research"
    PRODUCT = "product"
    TECHNICAL = "technical"
    CRITIC = "critic"
    SUPERVISOR = "supervisor"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def make_id() -> str:
    return uuid4().hex


class AnalysisRequest(BaseModel):
    idea: str = Field(..., min_length=3, max_length=2000)
    context: str | None = Field(default=None, max_length=4000)
    constraints: dict[str, Any] = Field(default_factory=dict)


class CreateAnalysisResponse(BaseModel):
    analysis_id: str = Field(alias="analysisId")
    status: AnalysisStatus
    stream_url: str = Field(alias="streamUrl")


class AgentStage(BaseModel):
    id: AgentId
    name: str
    status: AgentStatus = AgentStatus.IDLE
    current_task: str | None = Field(default=None, alias="currentTask")
    started_at: datetime | None = Field(default=None, alias="startedAt")
    completed_at: datetime | None = Field(default=None, alias="completedAt")


class LogEvent(BaseModel):
    id: str = Field(default_factory=make_id)
    timestamp: datetime = Field(default_factory=utc_now)
    message: str
    agent: AgentId | None = None
    type: LogType = LogType.INFO


class EvidenceItem(BaseModel):
    text: str
    url: str | None = None
    source_title: str | None = Field(default=None, alias="sourceTitle")
    source: str | None = None
    snippet: str | None = None


class AgentResult(BaseModel):
    agent: AgentId
    summary: str
    scores: dict[str, float] = Field(default_factory=dict)
    evidence: list[str | EvidenceItem] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    next_actions: list[str] = Field(default_factory=list, alias="next_actions")
    raw: dict[str, Any] = Field(default_factory=dict)


class CriticResult(AgentResult):
    needs_recheck: bool = Field(default=False, alias="needsRecheck")
    recheck_targets: list[AgentId] = Field(default_factory=list, alias="recheckTargets")
    recheck_reason: str | None = Field(default=None, alias="recheckReason")


class FinalReport(BaseModel):
    verdict: Literal["pursue", "pivot", "reject"]
    verdict_label: str = Field(alias="verdictLabel")
    summary: str
    scores: dict[str, float]
    key_reasons: list[str] = Field(alias="keyReasons")
    agent_consensus: list[str] = Field(alias="agentConsensus")
    markdown: str


class AnalysisJob(BaseModel):
    id: str = Field(default_factory=make_id)
    idea: str
    context: str | None = None
    constraints: dict[str, Any] = Field(default_factory=dict)
    status: AnalysisStatus = AnalysisStatus.QUEUED
    phase: str = "queued"
    created_at: datetime = Field(default_factory=utc_now, alias="createdAt")
    updated_at: datetime = Field(default_factory=utc_now, alias="updatedAt")
    reflection_loops: int = Field(default=0, alias="reflectionLoops")
    agents: dict[AgentId, AgentStage]
    logs: list[LogEvent] = Field(default_factory=list)
    results: dict[AgentId, AgentResult] = Field(default_factory=dict)
    critic: CriticResult | None = None
    final_report: FinalReport | None = Field(default=None, alias="finalReport")
    error: str | None = None


def default_agent_stages() -> dict[AgentId, AgentStage]:
    return {
        AgentId.RESEARCH: AgentStage(id=AgentId.RESEARCH, name="Research Agent"),
        AgentId.PRODUCT: AgentStage(id=AgentId.PRODUCT, name="Product Agent"),
        AgentId.TECHNICAL: AgentStage(id=AgentId.TECHNICAL, name="Technical Agent"),
        AgentId.CRITIC: AgentStage(id=AgentId.CRITIC, name="Investor Critic"),
        AgentId.SUPERVISOR: AgentStage(id=AgentId.SUPERVISOR, name="Supervisor"),
    }


class StreamEvent(BaseModel):
    event: str
    data: dict[str, Any]
