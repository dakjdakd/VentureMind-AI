from __future__ import annotations

import json
import re
from typing import Any, Callable

from app.core.config import Settings, get_settings


class LLMError(RuntimeError):
    pass


class OpenAICompatibleLLM:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    @property
    def mock_mode(self) -> bool:
        return not self.settings.openai_api_key

    async def generate_json(
        self,
        *,
        agent_name: str,
        system_prompt: str,
        payload: dict[str, Any],
        fallback: Callable[[dict[str, Any]], dict[str, Any]],
    ) -> dict[str, Any]:
        if self.mock_mode:
            return fallback(payload)

        try:
            from openai import AsyncOpenAI
        except ImportError as exc:
            raise LLMError("The openai package is not installed. Install backend dependencies first.") from exc

        client = AsyncOpenAI(
            api_key=self.settings.openai_api_key,
            base_url=self.settings.openai_base_url,
            timeout=self.settings.openai_timeout_seconds,
        )
        user_content = json.dumps(payload, ensure_ascii=False, indent=2)
        try:
            response = await client.chat.completions.create(
                model=self.settings.openai_model,
                temperature=0.2,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": (
                            f"You are {agent_name}. This is a single independent, stateless agent call. "
                            "Do not assume any prior conversation, memory, or hidden context. "
                            "Use only the JSON payload below and return only valid JSON.\n"
                            f"{user_content}"
                        ),
                    },
                ],
            )
        except Exception:
            return fallback(payload)

        content = response.choices[0].message.content or "{}"
        try:
            return self._parse_json(content)
        except Exception:
            return fallback(payload)

    def _parse_json(self, content: str) -> dict[str, Any]:
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", content, flags=re.DOTALL)
            if not match:
                raise LLMError("Model response did not contain JSON.")
            parsed = json.loads(match.group(0))
        if not isinstance(parsed, dict):
            raise LLMError("Model JSON response must be an object.")
        return parsed


llm = OpenAICompatibleLLM()
