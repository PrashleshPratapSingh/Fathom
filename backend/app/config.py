"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os


_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_default_sqlite_path = os.path.join(_backend_dir, "fathom_dev.db").replace("\\", "/")

class Settings(BaseSettings):
    """Fathom backend configuration.

    Reads from environment variables or .env file.
    Defaults to SQLite for local development (no Docker required).
    Set DATABASE_URL to a PostgreSQL DSN for production.
    """

    DATABASE_URL: str = f"sqlite+aiosqlite:///{_default_sqlite_path}"
    FATHOM_ENDPOINT: str = "http://localhost:8000/api/v1"

    # CORS origins allowed (frontend dev server)
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Evaluation Engine & AI Copilot configuration
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    DRIFT_THRESHOLD: float = 0.70
    JUDGE_LLM_API_KEY: str | None = None
    JUDGE_LLM_MODEL: str = "llama-3.3-70b-versatile"
    OPENAI_BASE_URL: str | None = None

    # Groq AI Integration (Ultra-fast inference)
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "qwen/qwen3.8-27b"

    @property
    def is_sqlite(self) -> bool:
        """Check if the configured database is SQLite."""
        return self.DATABASE_URL.startswith("sqlite")

    model_config = SettingsConfigDict(
        env_file=[
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
            ".env",
        ],
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
