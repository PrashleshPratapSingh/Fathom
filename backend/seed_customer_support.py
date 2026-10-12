"""Seed SQLite/PostgreSQL database with realistic Customer Support Agent traces using SQLAlchemy ORM.

Scenario: Customer Support Agent
  - Lookup order
  - Retrieve refund policy
  - Draft response
  - Send email

Includes clean sequential DAG chains and the 4 key evaluation/failure modes:
  1. Happy Path (SUCCESS)
  2. Tool Schema Error (TOOL_ERROR) -> 1-click AI Copilot fix
  3. Policy Violation (HALLUCINATION) -> LLM-as-a-judge failure
  4. Bad Decision (BAD_DECISION) -> Agent decision warning
  5. Rewound & Healed (REWOUND) -> Agent replay success
"""

import asyncio
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import delete
from app.database import async_session_factory, engine, Base
from app.models import TraceRun, TraceSpan, Evaluation

def utcnow():
    return datetime.now(timezone.utc)

async def seed():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # Clear existing data cleanly
        await db.execute(delete(Evaluation))
        await db.execute(delete(TraceSpan))
        await db.execute(delete(TraceRun))
        await db.commit()

        base_time = utcnow() - timedelta(minutes=45)

        # =====================================================================
        # Run 1: Customer Support Agent - SUCCESS (Order Return & Refund)
        # =====================================================================
        r1_id = uuid.uuid4()
        run1 = TraceRun(
            id=r1_id,
            name="Customer Support Agent - SUCCESS (Order Return & Refund)",
            status="completed",
            total_tokens=1850,
            total_latency_ms=3120.0,
            metadata_={"agent_type": "customer_support", "customer": "Alex Mercer", "ticket_id": "TCK-8012"},
            created_at=base_time + timedelta(minutes=5),
            updated_at=base_time + timedelta(minutes=6),
        )
        db.add(run1)

        s1_1_id = uuid.uuid4()
        s1_1 = TraceSpan(
            id=s1_1_id,
            run_id=r1_id,
            parent_span_id=None,
            name="lookup_customer_order",
            kind="tool_call",
            status="completed",
            input_data={"customer_id": "cust_8821", "order_id": "ORD-94218"},
            output_data={"order_id": "ORD-94218", "item": "Ergonomic Office Chair", "purchase_date": "2026-09-15", "amount": 289.00, "status": "delivered"},
            latency_ms=420.0,
            token_count=0,
            metadata_={"endpoint": "/api/orders/lookup", "http_status": 200},
            created_at=base_time + timedelta(minutes=5, seconds=0),
            updated_at=base_time + timedelta(minutes=5, seconds=1),
        )
        db.add(s1_1)

        s1_2_id = uuid.uuid4()
        s1_2 = TraceSpan(
            id=s1_2_id,
            run_id=r1_id,
            parent_span_id=s1_1_id,
            name="retrieve_refund_policy",
            kind="retrieval",
            status="completed",
            input_data={"query": "return window for furniture and damaged components"},
            output_data={"policy_id": "POL-104", "window_days": 30, "covers_damaged_parts": True, "restocking_fee": False},
            latency_ms=310.0,
            token_count=0,
            metadata_={"source": "vector_store", "collection": "support_policies"},
            created_at=base_time + timedelta(minutes=5, seconds=1),
            updated_at=base_time + timedelta(minutes=5, seconds=2),
        )
        db.add(s1_2)

        s1_3_id = uuid.uuid4()
        s1_3 = TraceSpan(
            id=s1_3_id,
            run_id=r1_id,
            parent_span_id=s1_2_id,
            name="draft_support_response",
            kind="llm_call",
            status="completed",
            input_data={"customer_inquiry": "My chair arrived with a damaged caster wheel. Can I get a return?", "order": "ORD-94218", "policy": "POL-104"},
            output_data={"response": "Hello Alex, I am sorry to hear about the damaged caster wheel on your Ergonomic Office Chair. Because your order was delivered on Sept 15, it is well within our 30-day return policy (POL-104). We can immediately send a free replacement wheel or issue a prepaid return label. Please let us know your preference!"},
            latency_ms=1850.0,
            token_count=1420,
            model_name="gpt-4o",
            metadata_={"temperature": 0.3, "system_prompt_version": "v3.1"},
            created_at=base_time + timedelta(minutes=5, seconds=2),
            updated_at=base_time + timedelta(minutes=5, seconds=4),
        )
        db.add(s1_3)

        ev1 = Evaluation(
            id=uuid.uuid4(),
            span_id=s1_3_id,
            phase="judge_llm",
            verdict="pass",
            score=0.98,
            details={"policy_compliance": True, "tone": "empathetic", "factual_consistency": 0.99},
            summary="Accurately referenced return policy POL-104 within 30-day window with empathetic tone.",
            created_at=base_time + timedelta(minutes=5, seconds=4),
        )
        db.add(ev1)

        s1_4_id = uuid.uuid4()
        s1_4 = TraceSpan(
            id=s1_4_id,
            run_id=r1_id,
            parent_span_id=s1_3_id,
            name="send_resolution_email",
            kind="tool_call",
            status="completed",
            input_data={"to": "alex.mercer@example.com", "subject": "Support Ticket TCK-8012: Return Assistance for Order ORD-94218", "channel": "zendesk"},
            output_data={"status": "delivered", "message_id": "msg_90123"},
            latency_ms=540.0,
            token_count=0,
            metadata_={"email_provider": "SendGrid", "status_code": 202},
            created_at=base_time + timedelta(minutes=5, seconds=4),
            updated_at=base_time + timedelta(minutes=5, seconds=5),
        )
        db.add(s1_4)

        # =====================================================================
        # Run 2: Customer Support Agent - TOOL_ERROR (Missing Order ID)
        # =====================================================================
        r2_id = uuid.uuid4()
        run2 = TraceRun(
            id=r2_id,
            name="Customer Support Agent - TOOL_ERROR (Missing Order ID)",
            status="failed",
            total_tokens=0,
            total_latency_ms=280.0,
            metadata_={"agent_type": "customer_support", "ticket_id": "TCK-8013", "customer": "Elena Rostova"},
            created_at=base_time + timedelta(minutes=10),
            updated_at=base_time + timedelta(minutes=11),
        )
        db.add(run2)

        s2_1_id = uuid.uuid4()
        s2_1 = TraceSpan(
            id=s2_1_id,
            run_id=r2_id,
            parent_span_id=None,
            name="lookup_customer_order",
            kind="tool_call",
            status="failed",
            input_data={"customer_id": "cust_9014", "order_id": ""},
            output_data={},
            error_message="HTTP 400 Bad Request: 'order_id' parameter cannot be empty or malformed string.",
            latency_ms=280.0,
            token_count=0,
            metadata_={"endpoint": "/api/orders/lookup", "http_status": 400},
            created_at=base_time + timedelta(minutes=10, seconds=0),
            updated_at=base_time + timedelta(minutes=10, seconds=1),
        )
        db.add(s2_1)

        ev2 = Evaluation(
            id=uuid.uuid4(),
            span_id=s2_1_id,
            phase="tool_check",
            verdict="failure",
            score=0.0,
            details={"error": "MissingRequiredParameter", "parameter": "order_id", "schema_validation": "failed"},
            summary="Tool call failed: 'order_id' was passed as empty string. The agent did not extract order ID from customer ticket.",
            created_at=base_time + timedelta(minutes=10, seconds=1),
        )
        db.add(ev2)

        # =====================================================================
        # Run 3: Customer Support Agent - HALLUCINATION (Unauthorized Refund)
        # =====================================================================
        r3_id = uuid.uuid4()
        run3 = TraceRun(
            id=r3_id,
            name="Customer Support Agent - HALLUCINATION (Unauthorized Refund)",
            status="failed",
            total_tokens=1680,
            total_latency_ms=2950.0,
            metadata_={"agent_type": "customer_support", "ticket_id": "TCK-8014", "customer": "Marcus Vance"},
            created_at=base_time + timedelta(minutes=15),
            updated_at=base_time + timedelta(minutes=16),
        )
        db.add(run3)

        s3_1_id = uuid.uuid4()
        s3_1 = TraceSpan(
            id=s3_1_id,
            run_id=r3_id,
            parent_span_id=None,
            name="lookup_customer_order",
            kind="tool_call",
            status="completed",
            input_data={"customer_id": "cust_3301", "order_id": "ORD-51002"},
            output_data={"order_id": "ORD-51002", "item": "Enterprise Server Rack", "purchase_date": "2026-06-01", "amount": 1499.00, "status": "delivered_115_days_ago"},
            latency_ms=390.0,
            token_count=0,
            metadata_={"endpoint": "/api/orders/lookup", "http_status": 200},
            created_at=base_time + timedelta(minutes=15, seconds=0),
            updated_at=base_time + timedelta(minutes=15, seconds=1),
        )
        db.add(s3_1)

        s3_2_id = uuid.uuid4()
        s3_2 = TraceSpan(
            id=s3_2_id,
            run_id=r3_id,
            parent_span_id=s3_1_id,
            name="retrieve_refund_policy",
            kind="retrieval",
            status="completed",
            input_data={"query": "refund policy orders older than 90 days"},
            output_data={"policy_id": "POL-109", "strict_limit_days": 30, "exceptions": "None. Orders past 30 days are non-refundable. Offer manufacturer warranty repair only."},
            latency_ms=280.0,
            token_count=0,
            metadata_={"source": "vector_store"},
            created_at=base_time + timedelta(minutes=15, seconds=1),
            updated_at=base_time + timedelta(minutes=15, seconds=2),
        )
        db.add(s3_2)

        s3_3_id = uuid.uuid4()
        s3_3 = TraceSpan(
            id=s3_3_id,
            run_id=r3_id,
            parent_span_id=s3_2_id,
            name="draft_support_response",
            kind="llm_call",
            status="failed",
            input_data={"customer_inquiry": "I purchased this server rack 4 months ago and want a full cash refund.", "order": "ORD-51002", "policy": "POL-109"},
            output_data={"response": "Dear Marcus, I have processed a full $1,499.00 cash refund directly to your credit card! You should see the funds reflected within 3-5 business days."},
            error_message="LLM Judge Evaluation Failure: Policy violation - unauthorized cash refund granted on 115-day-old purchase.",
            latency_ms=2280.0,
            token_count=1680,
            model_name="gpt-4o",
            metadata_={"temperature": 0.7},
            created_at=base_time + timedelta(minutes=15, seconds=2),
            updated_at=base_time + timedelta(minutes=15, seconds=4),
        )
        db.add(s3_3)

        ev3 = Evaluation(
            id=uuid.uuid4(),
            span_id=s3_3_id,
            phase="judge_llm",
            verdict="failure",
            score=0.12,
            details={"violation": "UnauthorizedRefund", "policy_ref": "POL-109", "allowed_action": "warranty_referral", "agent_action": "full_refund"},
            summary="Severe hallucination / policy violation: Agent promised a $1,499.00 refund on a 115-day-old purchase, directly contradicting Policy POL-109.",
            created_at=base_time + timedelta(minutes=15, seconds=4),
        )
        db.add(ev3)

        # =====================================================================
        # Run 4: Customer Support Agent - BAD_DECISION (Abrupt Ticket Closure)
        # =====================================================================
        r4_id = uuid.uuid4()
        run4 = TraceRun(
            id=r4_id,
            name="Customer Support Agent - BAD_DECISION (Abrupt Closure)",
            status="failed",
            total_tokens=980,
            total_latency_ms=1890.0,
            metadata_={"agent_type": "customer_support", "ticket_id": "TCK-8015", "customer": "Chloe Bennett"},
            created_at=base_time + timedelta(minutes=20),
            updated_at=base_time + timedelta(minutes=21),
        )
        db.add(run4)

        s4_1_id = uuid.uuid4()
        s4_1 = TraceSpan(
            id=s4_1_id,
            run_id=r4_id,
            parent_span_id=None,
            name="lookup_customer_order",
            kind="tool_call",
            status="completed",
            input_data={"customer_id": "cust_4120", "order_id": "ORD-11940"},
            output_data={"order_id": "ORD-11940", "item": "Noise Cancelling Headphones", "status": "shipped_missing_package"},
            latency_ms=340.0,
            token_count=0,
            metadata_={"http_status": 200},
            created_at=base_time + timedelta(minutes=20, seconds=0),
            updated_at=base_time + timedelta(minutes=20, seconds=1),
        )
        db.add(s4_1)

        s4_2_id = uuid.uuid4()
        s4_2 = TraceSpan(
            id=s4_2_id,
            run_id=r4_id,
            parent_span_id=s4_1_id,
            name="decide_ticket_action",
            kind="agent_decision",
            status="failed",
            input_data={"customer_issue": "Package marked delivered but not received. Front porch camera shows no carrier delivery.", "priority": "urgent"},
            output_data={"action": "close_ticket_unresolved", "notes": "Advised customer to check bushes or wait another week."},
            error_message="Evaluation warning: Agent closed urgent missing package ticket without initiating carrier claim or escalation.",
            latency_ms=1550.0,
            token_count=980,
            model_name="gpt-4o",
            metadata_={"decision_engine": "react_planner"},
            created_at=base_time + timedelta(minutes=20, seconds=1),
            updated_at=base_time + timedelta(minutes=20, seconds=3),
        )
        db.add(s4_2)

        ev4 = Evaluation(
            id=uuid.uuid4(),
            span_id=s4_2_id,
            phase="semantic_drift",
            verdict="warning",
            score=0.45,
            details={"issue": "PrematureTicketClosure", "expected_action": "escalate_to_logistics", "actual_action": "close_unresolved"},
            summary="Agent decided to close urgent delivery dispute ticket unresolved instead of escalating to carrier logistics claim.",
            created_at=base_time + timedelta(minutes=20, seconds=3),
        )
        db.add(ev4)

        # =====================================================================
        # Run 5: Customer Support Agent - REWOUND & HEALED (Password Reset)
        # =====================================================================
        r5_id = uuid.uuid4()
        run5 = TraceRun(
            id=r5_id,
            name="Customer Support Agent - REWOUND & HEALED (Password Reset)",
            status="completed",
            total_tokens=1520,
            total_latency_ms=2890.0,
            metadata_={"agent_type": "customer_support", "ticket_id": "TCK-8016", "customer": "Devon Miller", "rewound": True},
            created_at=base_time + timedelta(minutes=25),
            updated_at=base_time + timedelta(minutes=26),
        )
        db.add(run5)

        s5_1_id = uuid.uuid4()
        s5_1 = TraceSpan(
            id=s5_1_id,
            run_id=r5_id,
            parent_span_id=None,
            name="lookup_customer_account",
            kind="tool_call",
            status="completed",
            input_data={"email": "devon.miller@example.com"},
            output_data={"user_id": "usr_9918", "account_status": "locked_attempts_exceeded", "tier": "gold"},
            latency_ms=310.0,
            token_count=0,
            metadata_={"http_status": 200},
            created_at=base_time + timedelta(minutes=25, seconds=0),
            updated_at=base_time + timedelta(minutes=25, seconds=1),
        )
        db.add(s5_1)

        s5_2_id = uuid.uuid4()
        s5_2 = TraceSpan(
            id=s5_2_id,
            run_id=r5_id,
            parent_span_id=s5_1_id,
            name="generate_temp_unlock_link",
            kind="tool_call",
            status="rewound",
            input_data={"user_id": "usr_9918", "expiry_minutes": 15, "auth_source": "ai_copilot_patch"},
            output_data={"link": "https://auth.acme.com/unlock?token=sec_9918a&exp=15m", "status": "active"},
            latency_ms=480.0,
            token_count=0,
            metadata_={"rewound_from_span": "s_prev_failed", "patch_applied": "corrected expiry schema"},
            created_at=base_time + timedelta(minutes=25, seconds=1),
            updated_at=base_time + timedelta(minutes=25, seconds=2),
        )
        db.add(s5_2)

        s5_3_id = uuid.uuid4()
        s5_3 = TraceSpan(
            id=s5_3_id,
            run_id=r5_id,
            parent_span_id=s5_2_id,
            name="send_customer_email",
            kind="tool_call",
            status="completed",
            input_data={"to": "devon.miller@example.com", "subject": "Acme Gold Support: Account Unlock Link", "body": "Your account unlock link has been generated..."},
            output_data={"status": "delivered", "message_id": "msg_99211"},
            latency_ms=520.0,
            token_count=0,
            metadata_={"http_status": 202},
            created_at=base_time + timedelta(minutes=25, seconds=2),
            updated_at=base_time + timedelta(minutes=25, seconds=3),
        )
        db.add(s5_3)

        await db.commit()
        print("Successfully seeded Customer Support Agent runs with SQLAlchemy ORM!")

if __name__ == "__main__":
    asyncio.run(seed())
