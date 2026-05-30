from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.core.config import Settings, get_settings


class WebSearch:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    @property
    def enabled(self) -> bool:
        return self.settings.search_provider.lower() != "none" and bool(self.settings.search_api_key)

    async def search_many(self, queries: list[str]) -> list[dict[str, Any]]:
        if not self.enabled:
            return []

        results = await asyncio.gather(*(self.search(query) for query in queries), return_exceptions=True)
        merged: list[dict[str, Any]] = []
        seen_urls: set[str] = set()
        for item in results:
            if isinstance(item, Exception):
                continue
            for result in item:
                url = str(result.get("url", ""))
                if url and url in seen_urls:
                    continue
                if url:
                    seen_urls.add(url)
                merged.append(result)
        return merged[: self.settings.search_max_results * len(queries)]

    async def search(self, query: str) -> list[dict[str, Any]]:
        provider = self.settings.search_provider.lower()
        if provider == "tavily":
            return await self._tavily(query)
        if provider == "brave":
            return await self._brave(query)
        if provider == "serpapi":
            return await self._serpapi(query)
        if provider == "exa":
            return await self._exa(query)
        return []

    async def _tavily(self, query: str) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": self.settings.search_api_key,
                    "query": query,
                    "max_results": self.settings.search_max_results,
                    "search_depth": "basic",
                    "include_answer": False,
                },
            )
            response.raise_for_status()
            data = response.json()
        return [
            {
                "query": query,
                "title": item.get("title"),
                "url": item.get("url"),
                "snippet": item.get("content"),
                "source": "tavily",
            }
            for item in data.get("results", [])
        ]

    async def _brave(self, query: str) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={"X-Subscription-Token": str(self.settings.search_api_key)},
                params={"q": query, "count": self.settings.search_max_results},
            )
            response.raise_for_status()
            data = response.json()
        return [
            {
                "query": query,
                "title": item.get("title"),
                "url": item.get("url"),
                "snippet": item.get("description"),
                "source": "brave",
            }
            for item in data.get("web", {}).get("results", [])
        ]

    async def _serpapi(self, query: str) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://serpapi.com/search.json",
                params={
                    "engine": "google",
                    "q": query,
                    "api_key": self.settings.search_api_key,
                    "num": self.settings.search_max_results,
                },
            )
            response.raise_for_status()
            data = response.json()
        return [
            {
                "query": query,
                "title": item.get("title"),
                "url": item.get("link"),
                "snippet": item.get("snippet"),
                "source": "serpapi",
            }
            for item in data.get("organic_results", [])
        ]

    async def _exa(self, query: str) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.exa.ai/search",
                headers={"x-api-key": str(self.settings.search_api_key)},
                json={"query": query, "numResults": self.settings.search_max_results},
            )
            response.raise_for_status()
            data = response.json()
        return [
            {
                "query": query,
                "title": item.get("title"),
                "url": item.get("url"),
                "snippet": item.get("text"),
                "source": "exa",
            }
            for item in data.get("results", [])
        ]


web_search = WebSearch()

