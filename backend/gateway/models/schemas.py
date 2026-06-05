from pydantic import BaseModel, Field
from typing import Optional, Literal

class SignupSchema(BaseModel):
    fullname: str
    phone: str
    email: str
    password: str

class SigninSchema(BaseModel):
    username: str
    password: str


class PlanSearchSchema(BaseModel):
    query: str


class PlanSchema(BaseModel):
    plan_id: str
    name: str
    description: str
    price: float
    billing_cycle: Literal["monthly", "quarterly", "yearly"]
    features: list[str]
    recommended_for: list[str]
    active: bool = True


class SubscriptionCreateSchema(BaseModel):
    user_id: str
    plan_id: str


class SubscriptionChangeSchema(BaseModel):
    plan_id: str


class SubscriptionStatusUpdateSchema(BaseModel):
    status: Literal["active", "paused", "cancelled", "pending", "expired"]
    reason: Optional[str] = None


class SubscriptionSchema(BaseModel):
    subscription_id: str
    user_id: str
    plan_id: str
    status: Literal["active", "paused", "cancelled", "pending", "expired"]
    started_at: str
    updated_at: str
    next_billing_date: Optional[str] = None
    change_history: list[dict] = Field(default_factory=list)
