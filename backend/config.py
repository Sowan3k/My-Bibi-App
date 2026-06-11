"""
My Bibi — Application settings
All values sourced from environment variables. No hardcoded secrets.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Vault
    vault_path: str = "./vault"

    # Auth
    jwt_secret: str = "change-me-before-deploying"
    jwt_expire_minutes: int = 60
    invite_secret: str = "change-me-invite-secret"
    invite_expire_days: int = 7

    # URLs
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    # Ollama (Phase 3)
    ollama_base_url: str = "http://ollama:11434"
    ollama_model: str = "llama3.2:3b"

    # Environment
    environment: str = "development"

    @property
    def db_url(self) -> str:
        """SQLite database path inside vault."""
        return f"sqlite+aiosqlite:///{self.vault_path}/db.sqlite"

    @property
    def db_url_sync(self) -> str:
        """Sync SQLite URL (for init)."""
        return f"sqlite:///{self.vault_path}/db.sqlite"


settings = Settings()
