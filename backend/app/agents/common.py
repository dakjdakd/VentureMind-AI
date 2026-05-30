from __future__ import annotations

from pathlib import Path
from typing import Any

from app.schemas import AgentId, AgentResult, CriticResult, EvidenceItem, FinalReport


PROMPT_DIR = Path(__file__).resolve().parents[1] / "prompts"


def load_prompt(name: str) -> str:
    return (PROMPT_DIR / f"{name}.md").read_text(encoding="utf-8")


def evidence_from_payload(payload: dict[str, Any]) -> list[str | EvidenceItem]:
    evidence: list[str | EvidenceItem] = []
    for item in payload.get("evidence", []):
        if isinstance(item, dict):
            text = str(item.get("text") or item.get("title") or item.get("snippet") or item.get("url") or "")
            if not text:
                continue
            evidence.append(
                EvidenceItem(
                    text=text,
                    url=item.get("url") or item.get("source_url") or item.get("sourceUrl"),
                    sourceTitle=item.get("source_title") or item.get("sourceTitle") or item.get("title"),
                    source=item.get("source"),
                    snippet=item.get("snippet"),
                )
            )
        else:
            evidence.append(str(item))
    return evidence


def result_from_payload(agent: AgentId, payload: dict[str, Any]) -> AgentResult:
    return AgentResult(
        agent=agent,
        summary=str(payload.get("summary", "")),
        scores={str(k): float(v) for k, v in payload.get("scores", {}).items()},
        evidence=evidence_from_payload(payload),
        risks=[str(item) for item in payload.get("risks", [])],
        confidence=float(payload.get("confidence", 0.5)),
        next_actions=[str(item) for item in payload.get("next_actions", payload.get("nextActions", []))],
        raw=payload,
    )


def critic_from_payload(payload: dict[str, Any]) -> CriticResult:
    targets: list[AgentId] = []
    for item in payload.get("recheck_targets", payload.get("recheckTargets", [])):
        try:
            targets.append(AgentId(str(item)))
        except ValueError:
            continue

    return CriticResult(
        agent=AgentId.CRITIC,
        summary=str(payload.get("summary", "")),
        scores={str(k): float(v) for k, v in payload.get("scores", {}).items()},
        evidence=evidence_from_payload(payload),
        risks=[str(item) for item in payload.get("risks", [])],
        confidence=float(payload.get("confidence", 0.5)),
        next_actions=[str(item) for item in payload.get("next_actions", payload.get("nextActions", []))],
        raw=payload,
        needsRecheck=bool(payload.get("needs_recheck", payload.get("needsRecheck", False))),
        recheckTargets=targets,
        recheckReason=payload.get("recheck_reason", payload.get("recheckReason")),
    )


def report_from_payload(payload: dict[str, Any]) -> FinalReport:
    return FinalReport(
        verdict=payload.get("verdict", "pivot"),
        verdictLabel=str(payload.get("verdict_label", payload.get("verdictLabel", "PIVOT"))),
        summary=str(payload.get("summary", "")),
        scores={str(k): float(v) for k, v in payload.get("scores", {}).items()},
        keyReasons=[str(item) for item in payload.get("key_reasons", payload.get("keyReasons", []))],
        agentConsensus=[str(item) for item in payload.get("agent_consensus", payload.get("agentConsensus", []))],
        markdown=str(payload.get("markdown", "")),
    )


def idea_label(payload: dict[str, Any]) -> str:
    return str(payload.get("idea", "the proposed venture"))
