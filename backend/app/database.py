"""Async SQLAlchemy engine, session factory, and FastAPI dependency.

Supports both PostgreSQL (production) and SQLite (local development).
The database backend is determined by the DATABASE_URL setting.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# Build engine kwargs based on backend
_engine_kwargs: dict = {"echo": False}

if settings.is_sqlite:
    # SQLite doesn't support pool_size / max_overflow / pool_pre_ping
    # connect_args needed for SQLite to allow multi-threaded access
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_size"] = 20
    _engine_kwargs["max_overflow"] = 10
    _engine_kwargs["pool_pre_ping"] = True

# Async engine — connection pool to PostgreSQL or SQLite file
engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

# Session factory — creates new async sessions
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    pass


async def get_db():
    """FastAPI dependency that provides an async database session.

    Usage in a router:
        @router.post("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
