from __future__ import annotations

import asyncio
from typing import Any

from app.agents import critic, product, research, supervisor, technical
from app.core.config import Settings, get_settings
from app.core.state import WorkflowState
from app.schemas import AgentId, AgentStatus, AnalysisStatus, LogType
from app.services.store import AnalysisStore, store

try:
    from langgraph.graph import END, START, StateGraph
except ImportError:  # pragma: no cover - dependency is declared in pyproject
    END = START = None
    StateGraph = None


class VentureMindOrchestrator:
    def __init__(self, analysis_store: AnalysisStore = store, settings: Settings | None = None) -> None:
        self.store = analysis_store
        self.settings = settings or get_settings()
        self.graph = self._build_graph() if StateGraph else None

    async def run_analysis(self, analysis_id: str) -> None:
        job = await self.store.get(analysis_id)
        if not job:
            return

        await self.store.set_status(analysis_id, AnalysisStatus.RUNNING, "research")
        initial: WorkflowState = {
            "analysis_id": analysis_id,
            "idea": job.idea,
            "context": job.context,
            "constraints": job.constraints,
            "reflection_loops": 0,
        }

        try:
            if self.graph:
                await self.graph.ainvoke(initial)
            else:
                await self._run_without_langgraph(initial)
            await self.store.set_status(analysis_id, AnalysisStatus.COMPLETED, "done")
            await self.store.log(analysis_id, "Analysis workflow completed.", LogType.SUCCESS)
        except Exception as exc:  # noqa: BLE001 - API should surface workflow failures cleanly
            await self.store.fail(analysis_id, f"Analysis failed: {exc}")

    def _build_graph(self):
        graph = StateGraph(WorkflowState)
        graph.add_node("do_research", self._research_node)
        graph.add_node("do_product_technical", self._product_technical_node)
        graph.add_node("do_critic", self._critic_node)
        graph.add_node("do_recheck", self._recheck_node)
        graph.add_node("do_supervisor", self._supervisor_node)

        graph.add_edge(START, "do_research")
        graph.add_edge("do_research", "do_product_technical")
        graph.add_edge("do_product_technical", "do_critic")
        graph.add_conditional_edges("do_critic", self._critic_route, {"recheck": "do_recheck", "supervisor": "do_supervisor"})
        graph.add_edge("do_recheck", "do_critic")
        graph.add_edge("do_supervisor", END)
        return graph.compile()

    async def _run_without_langgraph(self, state: WorkflowState) -> WorkflowState:
        state = await self._research_node(state)
        state = await self._product_technical_node(state)
        state = await self._critic_node(state)
        while self._critic_route(state) == "recheck":
            state = await self._recheck_node(state)
            state = await self._critic_node(state)
        return await self._supervisor_node(state)

    async def _research_node(self, state: WorkflowState) -> WorkflowState:
        analysis_id = state["analysis_id"]
        await self.store.set_status(analysis_id, AnalysisStatus.RUNNING, "research")
        await self.store.set_agent(analysis_id, AgentId.RESEARCH, AgentStatus.RUNNING, "Collecting market signals and external facts.")
        await self.store.log(analysis_id, "[Research] Searching market context and comparable signals.", LogType.INFO, AgentId.RESEARCH)
        result = await research.run(dict(state))
        await self.store.save_result(analysis_id, result)
        await self.store.set_agent(analysis_id, AgentId.RESEARCH, AgentStatus.COMPLETED, "Research complete.")
        await self.store.log(analysis_id, "[Research] Market intelligence packet completed.", LogType.SUCCESS, AgentId.RESEARCH)
        return {**state, "research": result}

    async def _product_technical_node(self, state: WorkflowState) -> WorkflowState:
        analysis_id = state["analysis_id"]
        await self.store.set_status(analysis_id, AnalysisStatus.RUNNING, "product_technical")
        await self.store.set_agent(analysis_id, AgentId.PRODUCT, AgentStatus.RUNNING, "Building user personas and demand map.")
        await self.store.set_agent(analysis_id, AgentId.TECHNICAL, AgentStatus.RUNNING, "Estimating implementation difficulty and cost.")
        await self.store.log(analysis_id, "[Product/Technical] Running parallel analysis from research context.", LogType.INFO)
        payload = self._jsonable_state(state)
        product_result, technical_result = await asyncio.gather(product.run(payload), technical.run(payload))
        await self.store.save_result(analysis_id, product_result)
        await self.store.save_result(analysis_id, technical_result)
        await self.store.set_agent(analysis_id, AgentId.PRODUCT, AgentStatus.COMPLETED, "Persona and demand analysis complete.")
        await self.store.set_agent(analysis_id, AgentId.TECHNICAL, AgentStatus.COMPLETED, "Feasibility model complete.")
        await self.store.log(analysis_id, "[Product/Technical] Parallel branch completed.", LogType.SUCCESS)
        return {**state, "product": product_result, "technical": technical_result}

    async def _critic_node(self, state: WorkflowState) -> WorkflowState:
        analysis_id = state["analysis_id"]
        await self.store.set_status(analysis_id, AnalysisStatus.RUNNING, "critic")
        await self.store.set_agent(analysis_id, AgentId.CRITIC, AgentStatus.RUNNING, "Red-teaming assumptions and unit economics.")
        await self.store.log(analysis_id, "[Critic] Stress-testing market, product, and technical conclusions.", LogType.WARNING, AgentId.CRITIC)
        result = await critic.run(self._jsonable_state(state))
        await self.store.save_result(analysis_id, result)
        status = AgentStatus.WARNING if result.risks else AgentStatus.COMPLETED
        await self.store.set_agent(analysis_id, AgentId.CRITIC, status, "Critic review complete.")
        if result.needs_recheck:
            await self.store.log(analysis_id, f"[Critic] Re-check requested: {result.recheck_reason}", LogType.WARNING, AgentId.CRITIC)
        else:
            await self.store.log(analysis_id, "[Critic] No re-check required.", LogType.SUCCESS, AgentId.CRITIC)
        return {**state, "critic": result}

    def _critic_route(self, state: WorkflowState) -> str:
        critic_result = state.get("critic")
        if not critic_result:
            return "supervisor"
        loops = int(state.get("reflection_loops", 0))
        if critic_result.needs_recheck and loops < self.settings.max_reflection_loops:
            return "recheck"
        return "supervisor"

    async def _recheck_node(self, state: WorkflowState) -> WorkflowState:
        analysis_id = state["analysis_id"]
        critic_result = state["critic"]
        loops = int(state.get("reflection_loops", 0)) + 1
        await self.store.increment_reflection(analysis_id)
        await self.store.set_status(analysis_id, AnalysisStatus.RUNNING, "reflection")
        await self.store.log(analysis_id, f"[Supervisor] Reflection loop {loops}: {critic_result.recheck_reason}", LogType.WARNING, AgentId.SUPERVISOR)

        targets = critic_result.recheck_targets or [AgentId.RESEARCH, AgentId.TECHNICAL]
        updated_state: WorkflowState = {**state, "reflection_loops": loops}
        payload = self._jsonable_state(updated_state)

        if AgentId.RESEARCH in targets:
            await self.store.set_agent(analysis_id, AgentId.RESEARCH, AgentStatus.RUNNING, "Re-checking market evidence.")
            updated_state["research"] = await research.run(payload)
            await self.store.save_result(analysis_id, updated_state["research"])
            await self.store.set_agent(analysis_id, AgentId.RESEARCH, AgentStatus.COMPLETED, "Research re-check complete.")

        branches = []
        branch_names: list[AgentId] = []
        if AgentId.PRODUCT in targets:
            branch_names.append(AgentId.PRODUCT)
            branches.append(product.run(self._jsonable_state(updated_state)))
            await self.store.set_agent(analysis_id, AgentId.PRODUCT, AgentStatus.RUNNING, "Re-checking demand assumptions.")
        if AgentId.TECHNICAL in targets:
            branch_names.append(AgentId.TECHNICAL)
            branches.append(technical.run(self._jsonable_state(updated_state)))
            await self.store.set_agent(analysis_id, AgentId.TECHNICAL, AgentStatus.RUNNING, "Re-checking cost assumptions.")

        if branches:
            results = await asyncio.gather(*branches)
            for agent_id, result in zip(branch_names, results, strict=True):
                updated_state[agent_id.value] = result
                await self.store.save_result(analysis_id, result)
                await self.store.set_agent(analysis_id, agent_id, AgentStatus.COMPLETED, "Re-check complete.")

        return updated_state

    async def _supervisor_node(self, state: WorkflowState) -> WorkflowState:
        analysis_id = state["analysis_id"]
        await self.store.set_status(analysis_id, AnalysisStatus.RUNNING, "supervisor")
        await self.store.set_agent(analysis_id, AgentId.SUPERVISOR, AgentStatus.RUNNING, "Compiling final board verdict.")
        await self.store.log(analysis_id, "[Supervisor] Aggregating agent outputs into final report.", LogType.INFO, AgentId.SUPERVISOR)
        report = await supervisor.run(self._jsonable_state(state))
        await self.store.save_report(analysis_id, report)
        await self.store.set_agent(analysis_id, AgentId.SUPERVISOR, AgentStatus.COMPLETED, "Report ready.")
        await self.store.log(analysis_id, f"[Supervisor] Final verdict generated: {report.verdict_label}.", LogType.SUCCESS, AgentId.SUPERVISOR)
        return {**state, "final_report": report}

    def _jsonable_state(self, state: WorkflowState) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        for key, value in state.items():
            if hasattr(value, "model_dump"):
                payload[key] = value.model_dump(mode="json", by_alias=True)
            else:
                payload[key] = value
        return payload


orchestrator = VentureMindOrchestrator()
