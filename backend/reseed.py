import asyncio
from sqlalchemy import text
from app.database import engine, async_session_factory
from app.models import TraceRun, TraceSpan, Evaluation
from seed_mock_data import seed

async def reset_and_seed():
    print("🧹 Cleaning database...")
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE TABLE evaluations, trace_spans, trace_runs CASCADE;"))
    print("✅ Tables truncated.")
    
    # Run the seed function from seed_mock_data
    await seed()

if __name__ == "__main__":
    asyncio.run(reset_and_seed())
