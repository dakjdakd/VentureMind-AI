from __future__ import annotations

from typing import TypedDict

from app.schemas import AgentId, AgentResult, CriticResult, FinalReport


class WorkflowState(TypedDict, total=False):
    analysis_id: str
    idea: str
    context: str | None
    constraints: dict
    reflection_loops: int
    research: AgentResult
    product: AgentResult
    technical: AgentResult
    critic: CriticResult
    final_report: FinalReport

