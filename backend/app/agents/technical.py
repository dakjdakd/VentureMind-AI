from __future__ import annotations

from typing import Any

from app.agents.common import idea_label, load_prompt, result_from_payload
from app.schemas import AgentId, AgentResult
from app.services.llm import OpenAICompatibleLLM, llm


def fallback(payload: dict[str, Any]) -> dict[str, Any]:
    idea = idea_label(payload)
    return {
        "summary": (
            f"Technical feasibility for '{idea}' is plausible at prototype level, but execution risk depends on the operating environment and the number of real-world dependencies. "
            "A narrow MVP should separate the core user promise from expensive automation, integrations, logistics, or physical infrastructure. "
            "The largest technical risk is not whether a demo can be built, but whether it can run reliably, safely, and economically under real usage. "
            "Cost pressure should be modeled across setup, ongoing operations, support, failure handling, and external APIs or suppliers. "
            "If the concept touches regulated, physical, financial, health, safety, or transportation contexts, compliance and liability must be treated as first-order engineering constraints. "
            "The next technical milestone should prove the hardest assumption with a small prototype and a quantified operating-cost model."
        ),
        "scores": {"difficulty": 61, "cost_pressure": 68, "execution_risk": 64},
        "evidence": [
            "A demo can be built with standard cloud APIs and a lightweight workflow backend.",
            "Real-world operations may require additional infrastructure, monitoring, and fallback processes.",
            "Cost risk depends on usage volume, model choice, and external data/tool calls.",
            "The MVP should isolate the riskiest dependency before broad feature buildout.",
            "Reliability requirements rise quickly once the product affects money, safety, logistics, or customer operations.",
            "Manual operations may be acceptable early if they produce better learning at lower cost.",
            "Integration failure modes need explicit fallback paths before launch.",
            "Unit cost should be estimated per transaction, user, location, or workflow depending on the concept.",
        ],
        "risks": [
            "API cost variance.",
            "External dependency reliability.",
            "Underestimated operational edge cases.",
            "Compliance or safety requirements may be discovered too late.",
            "Prototype feasibility may hide unattractive operating economics.",
        ],
        "confidence": 0.7,
        "next_actions": [
            "Prototype the narrowest workflow that proves the hardest technical assumption.",
            "Set budget guardrails for API, infrastructure, staffing, and support costs.",
            "Define failure fallbacks for every external dependency.",
            "Create a 30-day build plan with owner, timeline, and acceptance criteria.",
            "Model unit economics under low, medium, and high usage scenarios.",
        ],
    }


async def run(payload: dict[str, Any], provider: OpenAICompatibleLLM = llm) -> AgentResult:
    data = await provider.generate_json(agent_name="Technical Feasibility Agent", system_prompt=load_prompt("technical"), payload=payload, fallback=fallback)
    return result_from_payload(AgentId.TECHNICAL, data)
