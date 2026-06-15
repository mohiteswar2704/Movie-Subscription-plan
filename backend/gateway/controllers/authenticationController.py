from datetime import datetime, timedelta
from threading import Lock
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException, Query
from models.schemas import (
    PlanSchema,
    PlanSearchSchema,
    SigninSchema,
    SignupSchema,
    SubscriptionChangeSchema,
    SubscriptionCreateSchema,
    SubscriptionStatusUpdateSchema,
    SubscriptionSchema,
)
import httpx

router = APIRouter(prefix="/authservice")
subscription_router = APIRouter(prefix="/subscriptionservice")

SPRING_URL = "http://localhost:8080/"
HTTP_CLIENT = httpx.AsyncClient(timeout=30.0)

PLAN_INDEX = {
    "basic": PlanSchema(
        plan_id="basic",
        name="Basic",
        description="Entry plan for casual viewers who want a low-cost subscription.",
        price=4.99,
        billing_cycle="monthly",
        features=["SD streaming", "1 device", "limited catalog"],
        recommended_for=["new users", "single viewer", "budget"],
    ),
    "standard": PlanSchema(
        plan_id="standard",
        name="Standard",
        description="Balanced plan for households that want more flexibility.",
        price=9.99,
        billing_cycle="monthly",
        features=["HD streaming", "2 devices", "full catalog"],
        recommended_for=["families", "most users", "hd"],
    ),
    "premium": PlanSchema(
        plan_id="premium",
        name="Premium",
        description="Best for power users who want multi-device access and priority support.",
        price=14.99,
        billing_cycle="monthly",
        features=["4K streaming", "4 devices", "offline downloads", "priority support"],
        recommended_for=["movie lovers", "multi-device", "4k"],
    ),
}

SUBSCRIPTIONS: dict[str, dict] = {}
SUBSCRIPTION_LOCK = Lock()


def _now() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _next_billing_date(plan: PlanSchema) -> str:
    if plan.billing_cycle == "yearly":
        delta = timedelta(days=365)
    elif plan.billing_cycle == "quarterly":
        delta = timedelta(days=90)
    else:
        delta = timedelta(days=30)
    return (datetime.utcnow() + delta).isoformat() + "Z"


def _subscription_response(record: dict) -> SubscriptionSchema:
    return SubscriptionSchema(**record)


def _plan_match_score(plan: PlanSchema, keywords: set[str]) -> int:
    searchable_text = " ".join(
        [plan.plan_id, plan.name, plan.description, " ".join(plan.features), " ".join(plan.recommended_for)]
    ).lower()
    score = sum(1 for keyword in keywords if keyword in searchable_text)

    if "budget" in keywords and plan.price <= 5:
        score += 2
    if "family" in keywords and "device" in searchable_text:
        score += 2
    if any(keyword in {"4k", "uhd", "ultra"} for keyword in keywords) and "4k" in searchable_text:
        score += 3
    return score

@router.post("/signup")
async def signup(U: SignupSchema):
    response = await HTTP_CLIENT.post(
        SPRING_URL + "user/signup",
        json=U.model_dump()
    )
    return response.json()

@router.post("/signin")
async def signin(U: SigninSchema):
    response = await HTTP_CLIENT.post(
        SPRING_URL + "user/signin",
        json=U.model_dump()
    )
    return response.json()


@router.get("/uinfo")
async def uinfo(Token: str = Header(...)):
    response = await HTTP_CLIENT.get(
        SPRING_URL + "user/uinfo",
        headers={"Token": Token}
    )
    return response.json()

@router.get("/profile")
async def profile(Token: str = Header(...)):
    response = await HTTP_CLIENT.get(
        SPRING_URL + "user/profile",
        headers={"Token": Token}
    )
    return response.json()

@router.get("/getallusers/{PAGE}/{SIZE}")
async def profile(PAGE: int, SIZE: int, Token: str = Header(...)):
    response = await HTTP_CLIENT.get(
        f"{SPRING_URL}user/getallusers/{PAGE}/{SIZE}",
        headers={"Token": Token}
    )
    return response.json()


@subscription_router.get("/plans", response_model=list[PlanSchema])
async def list_plans():
    return [plan for plan in PLAN_INDEX.values() if plan.active]


@subscription_router.get("/plans/{plan_id}", response_model=PlanSchema)
async def get_plan(plan_id: str):
    plan = PLAN_INDEX.get(plan_id.lower())
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@subscription_router.post("/plans/search", response_model=list[PlanSchema])
async def search_plans(payload: PlanSearchSchema):
    query = payload.query.strip().lower()
    if not query:
        return [plan for plan in PLAN_INDEX.values() if plan.active]

    keywords = set(query.split())
    scored_plans = sorted(
        (
            (_plan_match_score(plan, keywords), plan)
            for plan in PLAN_INDEX.values()
            if plan.active
        ),
        key=lambda item: (-item[0], item[1].price),
    )
    return [plan for score, plan in scored_plans if score > 0] or [plan for plan in PLAN_INDEX.values() if plan.active]


@subscription_router.get("/plans/search", response_model=list[PlanSchema])
async def search_plans_by_query(query: str = Query("")):
    return await search_plans(PlanSearchSchema(query=query))


@subscription_router.post("/subscriptions", response_model=SubscriptionSchema)
async def subscribe(payload: SubscriptionCreateSchema):
    plan = PLAN_INDEX.get(payload.plan_id.lower())
    if not plan or not plan.active:
        raise HTTPException(status_code=404, detail="Plan not found")

    with SUBSCRIPTION_LOCK:
        subscription_id = str(uuid4())
        record = {
            "subscription_id": subscription_id,
            "user_id": payload.user_id,
            "plan_id": plan.plan_id,
            "status": "active",
            "started_at": _now(),
            "updated_at": _now(),
            "next_billing_date": _next_billing_date(plan),
            "change_history": [
                {
                    "action": "created",
                    "from_plan": None,
                    "to_plan": plan.plan_id,
                    "timestamp": _now(),
                }
            ],
        }
        SUBSCRIPTIONS[subscription_id] = record

    return _subscription_response(record)


@subscription_router.get("/subscriptions/{subscription_id}", response_model=SubscriptionSchema)
async def get_subscription(subscription_id: str):
    record = SUBSCRIPTIONS.get(subscription_id)
    if not record:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return _subscription_response(record)


@subscription_router.get("/subscriptions/user/{user_id}", response_model=list[SubscriptionSchema])
async def list_user_subscriptions(user_id: str):
    return [
        _subscription_response(record)
        for record in SUBSCRIPTIONS.values()
        if record["user_id"] == user_id
    ]


@subscription_router.patch("/subscriptions/{subscription_id}/status", response_model=SubscriptionSchema)
async def update_subscription_status(subscription_id: str, payload: SubscriptionStatusUpdateSchema):
    record = SUBSCRIPTIONS.get(subscription_id)
    if not record:
        raise HTTPException(status_code=404, detail="Subscription not found")

    record["status"] = payload.status
    record["updated_at"] = _now()
    record.setdefault("change_history", []).append(
        {
            "action": "status_update",
            "status": payload.status,
            "reason": payload.reason,
            "timestamp": _now(),
        }
    )
    return _subscription_response(record)


@subscription_router.post("/subscriptions/{subscription_id}/change", response_model=SubscriptionSchema)
async def change_subscription_plan(subscription_id: str, payload: SubscriptionChangeSchema):
    record = SUBSCRIPTIONS.get(subscription_id)
    if not record:
        raise HTTPException(status_code=404, detail="Subscription not found")

    new_plan = PLAN_INDEX.get(payload.plan_id.lower())
    if not new_plan or not new_plan.active:
        raise HTTPException(status_code=404, detail="Target plan not found")

    old_plan_id = record["plan_id"]
    record["plan_id"] = new_plan.plan_id
    record["status"] = "active"
    record["updated_at"] = _now()
    record["next_billing_date"] = _next_billing_date(new_plan)
    record.setdefault("change_history", []).append(
        {
            "action": "plan_change",
            "from_plan": old_plan_id,
            "to_plan": new_plan.plan_id,
            "timestamp": _now(),
        }
    )
    return _subscription_response(record)