from __future__ import annotations

from typing import Any

from app.agents.common import idea_label, load_prompt, report_from_payload
from app.schemas import FinalReport
from app.services.llm import OpenAICompatibleLLM, llm


def fallback(payload: dict[str, Any]) -> dict[str, Any]:
    idea = idea_label(payload)
    return {
        "verdict": "pivot",
        "verdict_label": "PIVOT BEFORE BUILD",
        "summary": (
            f"'{idea}' has enough signal for a controlled prototype, but the board should not approve a full build until demand, repeat usage, and cost assumptions are validated. "
            "The concept has a plausible wedge if it can identify a narrow buyer segment with urgent need and measurable willingness to pay. "
            "However, the current evidence base is not strong enough to support a confident go decision, especially if operations, acquisition, or compliance costs are material. "
            "The strongest positive signal is that the idea can be framed around a specific pain or scarcity moment rather than a vague market trend. "
            "The dominant risk is that attention or stated interest will not convert into repeatable paid usage. "
            "The board should require a short validation sprint with paid conversion, substitute comparison, and unit economics targets before additional investment."
        ),
        "scores": {"market": 44, "product": 42, "technical": 48, "risk": 74},
        "key_reasons": [
            "The current evidence base is not strong enough for a confident go decision, so a staged validation path is more rational than full execution.",
            "Demand depends on a narrow segment and needs paid validation before product scope expands.",
            "Technical and operating costs could overwhelm early revenue if the team validates only user interest and not unit economics.",
            "The first milestone should prove repeatable buyer behavior rather than broad awareness.",
            "The board should preserve optionality by narrowing the wedge and capping spend.",
        ],
        "agent_consensus": [
            "Research: Market proxies are usable but not yet strong enough for investment-grade sizing. The team needs direct evidence from reachable buyers and substitutes.",
            "Product: Demand is plausible only in a sharp beachhead segment with a real purchase trigger. Paid validation matters more than survey enthusiasm.",
            "Technical: A prototype is feasible, but operating cost and reliability assumptions need a conservative model before scaling.",
            "Critic: The largest risk is mistaking novelty for durable demand. The project needs explicit kill criteria and a paid validation loop.",
        ],
        "markdown": (
            "# VentureMind AI Board Report\n\n"
            "## Executive Decision\n"
            "PIVOT BEFORE BUILD. The board should not approve full execution until the team proves paid demand, repeat behavior, and conservative unit economics.\n\n"
            "## Venture Thesis\n"
            "The concept may work as a narrow wedge if it targets a buyer with urgent need, reachable acquisition, and a clear substitute to displace. The current thesis is not yet broad-market ready.\n\n"
            "## Market Intelligence\n"
            "Market evidence should be treated as directional. Adjacent proxies can guide early sizing, but direct buyer frequency and substitute pricing are required before serious capital allocation.\n\n"
            "## Product Demand\n"
            "The product should be validated with a paid concierge or smoke test. The key question is not whether users like the idea, but whether they pay, repeat, and choose it over existing alternatives.\n\n"
            "## Technical and Operating Feasibility\n"
            "A narrow MVP is feasible, but the board should require a cost model covering setup, operations, support, external dependencies, and failure handling.\n\n"
            "## Red-Team Risks\n"
            "The venture can fail if novelty masks low frequency, if acquisition costs exceed gross profit, or if operations scale faster than revenue.\n\n"
            "## 30-Day Validation Plan\n"
            "1. Interview 20-30 target buyers.\n"
            "2. Run a paid test with a clear conversion threshold.\n"
            "3. Compare against three substitutes.\n"
            "4. Build a unit economics sensitivity model.\n"
            "5. Decide pursue, pivot, or stop based on pre-committed metrics.\n"
        ),
    }


async def run(payload: dict[str, Any], provider: OpenAICompatibleLLM = llm) -> FinalReport:
    data = await provider.generate_json(agent_name="Supervisor", system_prompt=load_prompt("supervisor"), payload=payload, fallback=fallback)
    return report_from_payload(data)
