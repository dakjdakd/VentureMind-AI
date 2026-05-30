from __future__ import annotations

from typing import Any

from app.agents.common import idea_label, load_prompt, critic_from_payload
from app.schemas import AgentId, CriticResult
from app.services.llm import OpenAICompatibleLLM, llm


def fallback(payload: dict[str, Any]) -> dict[str, Any]:
    idea = idea_label(payload)
    return {
        "summary": (
            f"The strongest objection to '{idea}' is that weak demand evidence and optimistic cost assumptions could make the venture look better than it is. "
            "The idea may be interesting at the concept level, but the board should separate curiosity, press appeal, and founder enthusiasm from durable willingness to pay. "
            "If the venture depends on unusual logistics, regulatory tolerance, expensive operations, or behavior change, the burden of proof is high. "
            "The most dangerous failure mode is building a product that people understand and even admire, but do not use often enough to support acquisition and operating costs. "
            "The evidence package should therefore be judged on paid conversion, repeat behavior, cost per served customer, and credible substitutes. "
            "A go decision should require a narrow validation milestone; otherwise the rational posture is to pivot, constrain scope, or stop."
        ),
        "scores": {"market_ceiling_risk": 72, "unit_economics_risk": 78, "execution_risk": 66},
        "evidence": [
            "Research confidence is moderate, not investment-grade.",
            "Product willingness-to-pay is not validated.",
            "Technical cost pressure may erase margins.",
            "The venture may confuse novelty with durable customer demand.",
            "Acquisition cost could exceed gross profit if the target segment is too dispersed.",
            "Substitutes may already solve the practical customer job at lower friction.",
            "Operational complexity can scale faster than revenue in physical or logistics-heavy ideas.",
            "A demo or viral story would not prove repeatable economics.",
        ],
        "risks": [
            "The business could optimize for demo novelty instead of durable demand.",
            "Unit economics may fail once acquisition and operating costs are included.",
            "Competitors or substitutes may be underestimated.",
            "The reachable market may be much smaller than the conceptual market.",
            "Regulatory, safety, or trust barriers may delay launch and raise costs.",
            "The team may overbuild before validating a paid wedge.",
        ],
        "confidence": 0.74,
        "next_actions": [
            "Re-check market sizing and cost assumptions with conservative inputs.",
            "Require a small paid-user validation milestone before build expansion.",
            "Define the kill criteria that would stop the project within 30 days.",
            "Compare the venture against the three cheapest substitutes customers already use.",
            "Run a unit economics sensitivity table before approving spend.",
        ],
        "needs_recheck": True,
        "recheck_targets": ["research", "technical"],
        "recheck_reason": "Market sizing and technical cost assumptions need one more pass before final verdict.",
    }


async def run(payload: dict[str, Any], provider: OpenAICompatibleLLM = llm) -> CriticResult:
    data = await provider.generate_json(agent_name="Investor Critic Agent", system_prompt=load_prompt("critic"), payload=payload, fallback=fallback)
    return critic_from_payload(data)
