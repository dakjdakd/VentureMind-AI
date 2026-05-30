from app.schemas import AnalysisJob, AnalysisRequest, AgentId, default_agent_stages


def test_default_agent_stages_include_all_agents():
    stages = default_agent_stages()

    assert set(stages.keys()) == {
        AgentId.RESEARCH,
        AgentId.PRODUCT,
        AgentId.TECHNICAL,
        AgentId.CRITIC,
        AgentId.SUPERVISOR,
    }


def test_analysis_job_serializes_frontend_aliases():
    job = AnalysisJob(idea="AI CFO for restaurants", agents=default_agent_stages())
    payload = job.model_dump(mode="json", by_alias=True)

    assert "createdAt" in payload
    assert "reflectionLoops" in payload
    assert "finalReport" in payload


def test_analysis_request_requires_idea():
    request = AnalysisRequest(idea="Open a bubble tea shop in the Sahara Desert")

    assert request.idea.startswith("Open")

