import asyncio

from app.core.orchestrator import VentureMindOrchestrator
from app.schemas import AnalysisRequest, AnalysisStatus
from app.services.store import AnalysisStore


def test_orchestrator_completes_with_mock_llm():
    asyncio.run(_run_orchestrator_assertions())


async def _run_orchestrator_assertions():
    analysis_store = AnalysisStore()
    orchestrator = VentureMindOrchestrator(analysis_store=analysis_store)
    job = await analysis_store.create(AnalysisRequest(idea="Open a bubble tea shop in the Sahara Desert"))

    await orchestrator.run_analysis(job.id)
    final_job = await analysis_store.get(job.id)

    assert final_job is not None
    assert final_job.status == AnalysisStatus.COMPLETED
    assert final_job.final_report is not None
    assert final_job.critic is not None
    assert final_job.reflection_loops >= 1
