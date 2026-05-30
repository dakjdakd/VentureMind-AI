from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_base_url: str = Field(default="https://api.deepseek.com", alias="OPENAI_BASE_URL")
    openai_model: str = Field(default="deepseek-v4-flash", alias="OPENAI_MODEL")
    openai_timeout_seconds: int = Field(default=60, alias="OPENAI_TIMEOUT_SECONDS")
    max_reflection_loops: int = Field(default=1, alias="MAX_REFLECTION_LOOPS")
    cors_origins: str = Field(default="http://localhost:3000,http://127.0.0.1:3000", alias="CORS_ORIGINS")
    search_provider: str = Field(default="none", alias="SEARCH_PROVIDER")
    search_api_key: str | None = Field(default=None, alias="SEARCH_API_KEY")
    search_max_results: int = Field(default=5, alias="SEARCH_MAX_RESULTS")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
