from __future__ import annotations

from typing import Any

from app.agents.common import idea_label, load_prompt, result_from_payload
from app.schemas import AgentId, AgentResult
from app.services.llm import OpenAICompatibleLLM, llm


def fallback(payload: dict[str, Any]) -> dict[str, Any]:
    idea = idea_label(payload)
    return {
        "summary": (
            f"Product demand for '{idea}' appears most credible in a narrow early-adopter segment rather than a broad mainstream audience. "
            "The buyer trigger needs to be urgent, repeated, and attached to a clear job-to-be-done; otherwise the idea risks becoming a one-time novelty. "
            "Users will compare the product against current workarounds, substitutes, and doing nothing, so the product must show a faster, safer, cheaper, or more status-enhancing path. "
            "Willingness to pay is plausible only if the moment of need is painful enough and the buyer trusts the solution before purchase. "
            "Retention will depend on whether the product becomes part of a recurring workflow or repeated life situation. "
            "The highest-value next step is a paid validation test with a sharply defined beachhead segment and a clear pass/fail threshold."
        ),
        "scores": {"pain_intensity": 56, "willingness_to_pay": 44, "pmf": 41},
        "evidence": [
            "The strongest user segment is likely a high-intent niche rather than a broad mass market.",
            "The product needs a clear job-to-be-done beyond novelty.",
            "Retention risk is high unless the purchase is tied to recurring operational need.",
            "A strong first segment should have both urgency and a reachable acquisition channel.",
            "The onboarding promise must be understandable in one sentence to reduce trial friction.",
            "Trust barriers may matter more than feature breadth for first-time conversion.",
            "A paid pre-order or concierge test is more informative than survey interest.",
            "Usage frequency should be measured before scaling product complexity.",
        ],
        "risks": [
            "Novelty-driven usage may fade quickly.",
            "Willingness to pay is unproven.",
            "The target segment may be too narrow to support acquisition costs.",
            "Users may understand the idea but still prefer familiar substitutes.",
            "Retention could collapse if the product is tied to rare occasions.",
        ],
        "confidence": 0.66,
        "next_actions": [
            "Interview 20-30 target users who recently experienced the problem.",
            "Estimate repeat purchase frequency using real past behavior rather than stated intent.",
            "Define a sharper beachhead segment with acquisition channel, budget owner, and trigger event.",
            "Run a paid smoke test with a minimum conversion threshold.",
            "Map the top three substitutes and why users would switch from each.",
        ],
    }


async def run(payload: dict[str, Any], provider: OpenAICompatibleLLM = llm) -> AgentResult:
    data = await provider.generate_json(agent_name="Product Analyst Agent", system_prompt=load_prompt("product"), payload=payload, fallback=fallback)
    return result_from_payload(AgentId.PRODUCT, data)
