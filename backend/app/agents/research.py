from __future__ import annotations

from typing import Any

from app.agents.common import idea_label, load_prompt, result_from_payload
from app.schemas import AgentId, AgentResult
from app.services.llm import OpenAICompatibleLLM, llm
from app.services.search import WebSearch, web_search


def fallback(payload: dict[str, Any]) -> dict[str, Any]:
    idea = idea_label(payload)
    search_results = payload.get("web_search_results", [])
    source_note = f"{len(search_results)} live search results were available." if search_results else "No live search API was configured; using internal proxy reasoning."
    return {
        "summary": (
            f"Initial market scan for '{idea}' points to a niche opportunity rather than a clearly proven mass market. "
            f"{source_note} Demand should be modeled through adjacent categories, location context, buyer frequency, and substitutes rather than direct category comps alone. "
            "The concept may benefit from novelty, scarcity, or convenience, but those signals do not automatically translate into repeatable revenue. "
            "Competitive pressure is likely to come from substitutes already solving the same underlying job, even if they do not look like the proposed product. "
            "The most important research gap is whether buyers face this pain often enough and in a high-value enough context to support paid conversion. "
            "Until direct willingness-to-pay and traffic data are collected, market size should be treated as a proxy estimate with moderate-to-low confidence."
        ),
        "scores": {"market_size": 38, "growth_trend": 52, "evidence_quality": 46},
        "evidence": [
            "Comparable demand should be inferred from adjacent categories rather than direct competitors.",
            "Distribution context and geography are likely to dominate market size estimates.",
            "Novelty may create initial attention but does not prove durable demand.",
            "The first credible sizing model should separate total curiosity from reachable paying customers.",
            "Substitute behavior is more important than category labels for this early market read.",
            "Pricing power depends on urgency, scarcity, convenience, and trust rather than the idea's novelty alone.",
            "Search-backed evidence is limited when no external search provider is configured.",
            "A narrow beachhead may be more realistic than broad consumer demand.",
        ],
        "risks": [
            "Low source density for direct market comparables.",
            "Market size may be overstated by adjacent-category proxies.",
            "Early attention may be confused with repeat purchase demand.",
            "Competitors may be indirect substitutes rather than obvious category peers.",
            "Pricing assumptions may fail if the pain point is not urgent.",
        ],
        "confidence": 0.62,
        "next_actions": [
            "Validate foot traffic and buyer frequency with at least 20 direct buyer conversations.",
            "Collect competitor and substitute pricing from the closest existing alternatives.",
            "Build a one-page sizing model separating TAM, reachable audience, and likely first-year customers.",
            "Run a landing-page or concierge test that asks for a real payment or deposit.",
            "Document the top five data gaps that would change the market score materially.",
        ],
    }


def build_queries(idea: str) -> list[str]:
    return [
        f"{idea} market size",
        f"{idea} competitors substitutes",
        f"{idea} industry trends demand",
    ]


async def run(payload: dict[str, Any], provider: OpenAICompatibleLLM = llm, search_provider: WebSearch = web_search) -> AgentResult:
    enriched_payload = dict(payload)
    idea = idea_label(payload)
    enriched_payload["web_search_queries"] = build_queries(idea)
    try:
        enriched_payload["web_search_results"] = await search_provider.search_many(enriched_payload["web_search_queries"])
    except Exception:
        enriched_payload["web_search_results"] = []
    data = await provider.generate_json(agent_name="Research Agent", system_prompt=load_prompt("research"), payload=enriched_payload, fallback=fallback)
    data.setdefault("raw", {})
    data["raw"]["sources"] = enriched_payload["web_search_results"]
    data["raw"]["queries"] = enriched_payload["web_search_queries"]
    return result_from_payload(AgentId.RESEARCH, data)
