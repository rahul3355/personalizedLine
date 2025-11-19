from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends, Header, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from typing import Union, Optional, Dict
import uuid, shutil, os, tempfile, threading, json, stripe, time, re, asyncio
from fastapi.responses import StreamingResponse
import io
from pydantic import BaseModel
import os
import logging
from . import jobs
from .file_streaming import (
    FileStreamingError,
    count_csv_rows,
    count_xlsx_rows,
    extract_csv_headers,
    extract_xlsx_headers,
    stream_input_to_tempfile,
)
from .supabase_client import supabase
from supabase import create_client
from fastapi import APIRouter, Body
from io import BytesIO
from datetime import datetime, timedelta
import requests
from fastapi import Query
import redis
from rq import Queue
 # reuse the same function your workers use


# Load env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

app = FastAPI()

import os
redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
redis_conn = redis.from_url(redis_url, decode_responses=True)
  # use localhost when FastAPI runs on your host
q = Queue(connection=redis_conn)


# Security scheme (adds Authorize button in Swagger)
security = HTTPBearer()

from dataclasses import dataclass
from typing import Any, Dict, Optional

try:
    import jwt
    from jwt import (
        ExpiredSignatureError,
        InvalidAudienceError,
        InvalidIssuerError,
        InvalidTokenError,
    )
except ModuleNotFoundError:  # pragma: no cover - fallback for offline environments
    from backend.app import jwt_fallback as jwt
    from backend.app.jwt_fallback import (
        ExpiredSignatureError,
        InvalidAudienceError,
        InvalidIssuerError,
        InvalidTokenError,
    )


@dataclass
class AuthenticatedUser:
    user_id: str
    claims: Dict[str, Any]

class CheckoutRequest(BaseModel):
    plan: str
    addon: bool = False
    quantity: int = 1

# Stripe Setup
STRIPE_SECRET = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
if STRIPE_SECRET:
    stripe.api_key = STRIPE_SECRET

# Base plan price mapping (subscriptions)
PLAN_PRICE_MAP = {
    "starter": os.getenv("STRIPE_PRICE_STARTER"),
    "growth": os.getenv("STRIPE_PRICE_GROWTH"),
    "pro": os.getenv("STRIPE_PRICE_PRO"),
}

# Add-on product mapping
ADDON_PRICE_MAP = {
    "free": os.getenv("STRIPE_PRICE_ADDON_FREE"),
    "starter": os.getenv("STRIPE_PRICE_ADDON_STARTER"),
    "growth": os.getenv("STRIPE_PRICE_ADDON_GROWTH"),
    "pro": os.getenv("STRIPE_PRICE_ADDON_PRO"),
}

PRICE_TO_PLAN = {pid: plan for plan, pid in PLAN_PRICE_MAP.items() if pid}

CREDITS_MAP = {
    "free": 500,
    "starter": 2000,
    "growth": 10000,
    "pro": 40000,
}

FRONTEND_BASE_URLS = os.getenv(
    "FRONTEND_BASE_URLS",
    "http://localhost:3000,http://127.0.0.1:3000",
)

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

ALLOWED_ORIGINS = [url.strip().rstrip("/") for url in FRONTEND_BASE_URLS.split(",") if url.strip()]

if not ALLOWED_ORIGINS:
    env_value = os.getenv("ENV", "").lower()
    debug_value = os.getenv("DEBUG", "").lower()
    if env_value in {"prod", "production"} or debug_value in {"0", "false", "no", "off"}:
        logging.warning(
            "FRONTEND_BASE_URLS resolved to an empty list in a production-like environment."
        )

    # Always fall back to localhost origins for development if no explicit list was provided.
    ALLOWED_ORIGINS = DEFAULT_ALLOWED_ORIGINS

APP_BASE_URL = os.getenv("APP_BASE_URL", "https://senditfast.ai").rstrip("/")

# Validate APP_BASE_URL in production to prevent localhost redirect issues
env_value = os.getenv("ENV", "").lower()
is_production = env_value in {"prod", "production"}
if is_production and "localhost" in APP_BASE_URL.lower():
    logging.error(
        f"CRITICAL: APP_BASE_URL is set to '{APP_BASE_URL}' in production environment. "
        "This will cause payment redirects to fail. Please set APP_BASE_URL to your production domain."
    )
    # In production, this is a critical error - log it prominently
    print("=" * 80)
    print("CRITICAL CONFIGURATION ERROR")
    print(f"APP_BASE_URL contains 'localhost': {APP_BASE_URL}")
    print("Payment redirects will FAIL in production!")
    print("Please set APP_BASE_URL environment variable to your production domain.")
    print("=" * 80)

SUCCESS_RETURN_PATH = os.getenv("STRIPE_SUCCESS_PATH", "/billing/success")
SUCCESS_URL = f"{APP_BASE_URL}{SUCCESS_RETURN_PATH}"
CANCEL_URL = f"{APP_BASE_URL}/billing?canceled=true"

STRIPE_SYNC_EVENTS = {
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "invoice.paid",
    "customer.subscription.deleted",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "customer.subscription.pending_update_applied",
    "customer.subscription.pending_update_expired",
    "customer.subscription.trial_will_end",
    "invoice.paid",
    "invoice.payment_failed",
    "invoice.payment_action_required",
    "invoice.upcoming",
    "invoice.marked_uncollectible",
    "invoice.payment_succeeded",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "payment_intent.canceled",
}


# Validate critical environment variables at startup
def _validate_env_vars():
    """Validate that all critical environment variables are set."""
    warnings = []

    # Check Stripe configuration
    if not STRIPE_SECRET:
        warnings.append("STRIPE_SECRET_KEY is not set - payments will not work")

    if not STRIPE_WEBHOOK_SECRET:
        warnings.append("STRIPE_WEBHOOK_SECRET is not set - webhook verification will fail")

    # Check if all price IDs are configured
    missing_prices = []
    for plan, price_id in PLAN_PRICE_MAP.items():
        if not price_id:
            missing_prices.append(f"STRIPE_PRICE_{plan.upper()}")

    for plan, price_id in ADDON_PRICE_MAP.items():
        if not price_id:
            missing_prices.append(f"STRIPE_PRICE_ADDON_{plan.upper()}")

    if missing_prices:
        warnings.append(f"Missing Stripe price IDs: {', '.join(missing_prices)}")

    # Check Supabase configuration
    if not os.getenv("SUPABASE_URL"):
        warnings.append("SUPABASE_URL is not set - database operations will fail")

    if not os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        warnings.append("SUPABASE_SERVICE_ROLE_KEY is not set - database operations will fail")

    if not os.getenv("SUPABASE_JWT_SECRET"):
        warnings.append("SUPABASE_JWT_SECRET is not set - JWT validation will fail")

    # Log all warnings
    if warnings:
        print("=" * 80)
        print("ENVIRONMENT CONFIGURATION WARNINGS:")
        for warning in warnings:
            print(f"  ⚠️  {warning}")
            logging.warning(warning)
        print("=" * 80)
    else:
        logging.info("All critical environment variables are configured")


# Run validation on startup
_validate_env_vars()


def _fetch_profile(user_id: str, columns: str = "id,email,stripe_customer_id") -> Optional[Dict[str, Any]]:
    try:
        response = (
            supabase.table("profiles")
            .select(columns)
            .eq("id", user_id)
            .single()
            .execute()
        )
        if getattr(response, "data", None):
            return response.data
    except Exception as exc:  # pragma: no cover - supabase availability
        print(f"[Stripe] Failed to fetch profile for {user_id}: {exc}")
    return None


def _update_profile(user_id: str, payload: Dict[str, Any]) -> None:
    if not payload:
        return

    try:
        supabase.table("profiles").upsert(
            {**payload, "id": user_id}
        ).execute()
    except Exception as exc:  # pragma: no cover - supabase availability
        print(f"[Stripe] Failed to update profile {user_id}: {exc}")


def _find_user_by_customer(customer_id: str) -> Optional[str]:
    if not customer_id:
        return None

    try:
        response = (
            supabase.table("profiles")
            .select("id")
            .eq("stripe_customer_id", customer_id)
            .single()
            .execute()
        )
        if getattr(response, "data", None):
            return response.data.get("id")
    except Exception as exc:  # pragma: no cover - supabase availability
        print(f"[Stripe] Failed to map customer {customer_id} via Supabase: {exc}")

    return None


def ensure_stripe_customer_id(user_id: str, email: Optional[str] = None) -> Optional[str]:
    profile = _fetch_profile(user_id)
    if profile:
        stripe_customer_id = profile.get("stripe_customer_id")
        if stripe_customer_id:
            return stripe_customer_id
        email = email or profile.get("email")

    if not STRIPE_SECRET:
        return None

    customer_payload: Dict[str, Any] = {"metadata": {"user_id": user_id}}
    if email:
        customer_payload["email"] = email

    try:
        customer = stripe.Customer.create(**customer_payload)
        stripe_customer_id = customer.get("id")

        if stripe_customer_id:
            _update_profile(user_id, {"stripe_customer_id": stripe_customer_id})

        return stripe_customer_id
    except Exception as e:
        print(f"[ERROR] Failed to create Stripe customer for user {user_id}: {e}")
        return None


def sync_stripe_customer(customer_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    if not STRIPE_SECRET or not customer_id:
        return {"status": "skipped", "reason": "missing_credentials"}

    if not user_id:
        user_id = _find_user_by_customer(customer_id)

    subscriptions = stripe.Subscription.list(
        customer=customer_id,
        limit=1,
        status="all",
        expand=["data.default_payment_method"],
    )

    if not subscriptions.data:
        snapshot: Dict[str, Any] = {"status": "none"}
    else:
        subscription = subscriptions.data[0]
        default_payment = subscription.get("default_payment_method")
        payment_method: Optional[Dict[str, Any]] = None
        if default_payment and not isinstance(default_payment, str):
            payment_method = {
                "brand": default_payment.get("card", {}).get("brand"),
                "last4": default_payment.get("card", {}).get("last4"),
            }

        snapshot = {
            "subscriptionId": subscription.get("id"),
            "status": subscription.get("status"),
            "priceId": subscription.get("items", {})
            .get("data", [{}])[0]
            .get("price", {})
            .get("id"),
            "currentPeriodEnd": subscription.get("current_period_end"),
            "currentPeriodStart": subscription.get("current_period_start"),
            "cancelAtPeriodEnd": subscription.get("cancel_at_period_end"),
            "paymentMethod": payment_method,
        }

    if user_id:
        profile_update: Dict[str, Any] = {
            "subscription_status": snapshot.get("status") or "inactive",
            "renewal_date": snapshot.get("currentPeriodEnd"),
            "stripe_subscription_id": snapshot.get("subscriptionId"),
            "stripe_price_id": snapshot.get("priceId"),
            "stripe_current_period_start": snapshot.get("currentPeriodStart"),
            "stripe_current_period_end": snapshot.get("currentPeriodEnd"),
            "stripe_cancel_at_period_end": snapshot.get("cancelAtPeriodEnd"),
            "stripe_payment_brand": snapshot.get("paymentMethod", {}).get("brand")
            if snapshot.get("paymentMethod")
            else None,
            "stripe_payment_last4": snapshot.get("paymentMethod", {}).get("last4")
            if snapshot.get("paymentMethod")
            else None,
        }

        plan_slug = PRICE_TO_PLAN.get(snapshot.get("priceId"))
        if plan_slug:
            profile_update["plan_type"] = plan_slug

        if snapshot.get("status") == "none":
            profile_update["subscription_status"] = "inactive"

        _update_profile(user_id, profile_update)

    return {
        "customerId": customer_id,
        "userId": user_id,
        "subscription": snapshot,
    }

from . import jobs

def start_worker():
    t = threading.Thread(target=jobs.worker_loop, daemon=True)
    t.start()


@app.on_event("startup")
async def startup_event():
    print("[Main] Running startup_event")
    start_worker()
    print("[Main] Worker started")


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

# ---- Extract user from JWT ----
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> AuthenticatedUser:
    token = credentials.credentials

    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET is not configured")

    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    issuer = os.getenv("SUPABASE_JWT_ISS", f"{supabase_url}/auth/v1" if supabase_url else None)
    audience = os.getenv("SUPABASE_JWT_AUD", os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated"))

    options = {"require": ["exp"]}
    if issuer:
        options["require"].append("iss")
    if audience:
        options["require"].append("aud")

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience=audience if audience else None,
            issuer=issuer if issuer else None,
            options={**options, "verify_aud": bool(audience)},
        )
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except (InvalidAudienceError, InvalidIssuerError) as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    return AuthenticatedUser(user_id=user_id, claims=payload)

# ✅ Step 1 — Parse headers
def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)


class ParseRequest(BaseModel):
    file_path: str


def assert_user_owns_path(file_path: str, user_id: str) -> str:
    """Ensure the storage path belongs to the authenticated user."""
    if not file_path:
        raise HTTPException(status_code=403, detail="Forbidden")

    normalized_path = file_path.lstrip("/")
    expected_prefix = f"{user_id}/"

    if not normalized_path.startswith(expected_prefix):
        raise HTTPException(status_code=403, detail="Forbidden")

    return normalized_path


@app.post("/parse_headers")
async def parse_headers(
    payload: ParseRequest = Body(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    try:
        file_path = payload.file_path
        if not file_path:
            raise HTTPException(status_code=400, detail="file_path required")

        file_path = assert_user_owns_path(file_path, current_user.user_id)

        supabase_client = get_supabase()
        temp_path = await stream_input_to_tempfile(supabase_client, file_path)
        print(f"[ParseHeaders] Streamed {file_path} to temporary file")

        try:
            if file_path.lower().endswith(".xlsx"):
                headers = extract_xlsx_headers(temp_path)
                row_count = count_xlsx_rows(temp_path)
            else:
                headers = extract_csv_headers(temp_path)
                row_count = count_csv_rows(temp_path)
        finally:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

        profile_res = (
            supabase_client.table("profiles")
            .select("credits_remaining, addon_credits")
            .eq("id", current_user.user_id)
            .single()
            .execute()
        )
        profile_data = getattr(profile_res, "data", None)
        if isinstance(profile_data, list):
            profile_data = profile_data[0] if profile_data else None
        credits_remaining = 0
        addon_credits = 0
        if isinstance(profile_data, dict):
            try:
                credits_remaining = int(profile_data.get("credits_remaining") or 0)
                addon_credits = int(profile_data.get("addon_credits") or 0)
            except (TypeError, ValueError):
                credits_remaining = 0
                addon_credits = 0

        total_credits = credits_remaining + addon_credits
        has_enough_credits = total_credits >= row_count
        missing_credits = max(0, row_count - total_credits)

        email_guess = ""
        email_variants = {"email", "emails", "e-mail", "e-mails", "mail", "mails"}
        for header in headers:
            normalized = header.strip().lower()
            normalized_simple = re.sub(r"[^a-z0-9]", "", normalized)
            if normalized in email_variants or normalized_simple in email_variants:
                email_guess = header
                break

        if not email_guess:
            pattern = re.compile(r"\b(e-?mail|mail)s?\b", re.IGNORECASE)
            for header in headers:
                if pattern.search(header):
                    email_guess = header
                    break

        print(
            f"[ParseHeaders] Parsed headers for {file_path}: {headers} — rows={row_count} "
            f"monthly={credits_remaining} addon={addon_credits} total={total_credits} enough={has_enough_credits} guess={email_guess!r}"
        )

        return {
            "headers": headers,
            "file_path": file_path,
            "row_count": row_count,
            "credits_remaining": total_credits,
            "has_enough_credits": has_enough_credits,
            "missing_credits": missing_credits,
            "email_header_guess": email_guess,
        }

    except HTTPException:
        raise
    except FileStreamingError as exc:
        print(f"[ParseHeaders] Streaming ERROR: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as e:
        print(f"[ParseHeaders] ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ✅ Step 2 — Create job
from pydantic import BaseModel

class ServiceComponents(BaseModel):
    core_offer: str
    key_differentiator: str
    cta: str
    include_fallback: Optional[bool] = None
    timeline: Optional[str] = None
    goal: Optional[str] = None
    fallback_action: Optional[str] = None


class JobRequest(BaseModel):
    file_path: str
    email_col: str
    service: Union[str, ServiceComponents]  # Accept either string (legacy) or structured components


@app.get("/jobs")
def list_jobs(
    current_user: AuthenticatedUser = Depends(get_current_user),
    offset: int = 0,
    limit: int = 5
):
    supabase = get_supabase()
    user_id = current_user.user_id

    jobs_res = (
        supabase.table("jobs")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)  # <-- pagination
        .execute()
    )
    jobs = jobs_res.data or []
    if not jobs:
        return []

    job_ids = [job["id"] for job in jobs]

    logs_res = (
        supabase.table("job_logs")
        .select("job_id, step, total, message")
        .in_("job_id", job_ids)
        .order("step", desc=True)
        .execute()
    )
    logs = logs_res.data or []
    latest_logs = {}
    for log in logs:
        job_id = log["job_id"]
        if job_id not in latest_logs:  # first (highest step) wins
            latest_logs[job_id] = log

    for job in jobs:
        last_log = latest_logs.get(job["id"])
        if last_log:
            step = last_log["step"]
            total = last_log["total"] or 1
            job["progress"] = int((step / total) * 100)
            job["message"] = last_log.get("message")
        else:
            job["progress"] = 0
            job["message"] = None

    return jobs



# ✅ Other routes unchanged (get_me, list_jobs, get_job, download, progress, checkout, webhook)
# ... keep all your code from [147†source] after this point


@app.get("/me")
def get_me(current_user: AuthenticatedUser = Depends(get_current_user)):
    try:
        user_id = current_user.user_id
        res = (
            supabase.table("profiles")
            .select("id, email, credits_remaining, addon_credits, max_credits, plan_type, subscription_status, renewal_date")
            .eq("id", user_id)
            .single()
            .execute()
        )

        if not res.data:
            # bootstrap default profile
            profile = {
                "id": user_id,
                "email": "unknown@example.com",
                "credits_remaining": 500,
                "max_credits": 5000,
                "plan_type": "free",
                "subscription_status": "active",
                "renewal_date": (datetime.utcnow() + timedelta(days=30)).isoformat()
            }
            supabase.table("profiles").insert(profile).execute()
            res = (
                supabase.table("profiles")
                .select("*")
                .eq("id", user_id)
                .single()
                .execute()
            )

        return res.data
    except HTTPException:
        raise
    except FileStreamingError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/account/ledger")
def get_account_ledger(
    limit: int = 50,
    offset: int = 0,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Get paginated ledger transactions for the current user
    """
    supabase = get_supabase()
    user_id = current_user.user_id

    # Get total count
    count_res = (
        supabase.table("ledger")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    total = count_res.count or 0

    # Get paginated transactions
    ledger_res = (
        supabase.table("ledger")
        .select("*")
        .eq("user_id", user_id)
        .order("ts", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    transactions = ledger_res.data or []

    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@app.get("/jobs")
def list_jobs(current_user: AuthenticatedUser = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = current_user.user_id

    jobs_res = (
        supabase.table("jobs")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    jobs = jobs_res.data or []

    for job in jobs:
        logs_res = (
            supabase.table("job_logs")
            .select("step,total,message")
            .eq("job_id", job["id"])
            .order("step", desc=True)
            .limit(1)
            .execute()
        )
        last_log = logs_res.data[0] if logs_res.data else None

        if last_log:
            step = last_log["step"]
            total = last_log["total"] or 1
            job["progress"] = int((step / total) * 100)
            job["message"] = last_log.get("message")
        else:
            job["progress"] = 0
            job["message"] = None

    return jobs


def _parse_profile_response(profile_res) -> Optional[Dict[str, Any]]:
    profile_data = getattr(profile_res, "data", None)
    if isinstance(profile_data, list):
        return profile_data[0] if profile_data else None
    if isinstance(profile_data, dict):
        return profile_data
    return None


def _reserve_credits_for_job(
    supabase_client,
    user_id: str,
    row_count: int,
    job_id: str,
    file_path: str,
) -> Dict[str, int]:
    max_attempts = 5
    for attempt in range(max_attempts):
        profile_res = (
            supabase_client.table("profiles")
            .select("credits_remaining, addon_credits")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        profile = _parse_profile_response(profile_res) or {}
        try:
            credits_remaining = int(profile.get("credits_remaining") or 0)
            addon_credits = int(profile.get("addon_credits") or 0)
        except (TypeError, ValueError):
            credits_remaining = 0
            addon_credits = 0

        total_credits = credits_remaining + addon_credits

        if total_credits < row_count:
            missing = row_count - total_credits
            print(
                f"[Credits] User {user_id} lacks {missing} credits for file {file_path}"
            )
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "insufficient_credits",
                    "row_count": row_count,
                    "credits_remaining": total_credits,
                    "missing_credits": missing,
                },
            )

        # Two-bucket deduction: use monthly credits first, then add-ons
        if credits_remaining >= row_count:
            # Use only monthly credits
            new_monthly = credits_remaining - row_count
            new_addon = addon_credits
            deduction_source = "monthly"
        else:
            # Use all monthly + some add-on credits
            remaining_needed = row_count - credits_remaining
            new_monthly = 0
            new_addon = addon_credits - remaining_needed
            deduction_source = "monthly+addon"

        update_res = (
            supabase_client.table("profiles")
            .update({
                "credits_remaining": new_monthly,
                "addon_credits": new_addon
            })
            .eq("id", user_id)
            .eq("credits_remaining", credits_remaining)
            .eq("addon_credits", addon_credits)
            .execute()
        )

        if getattr(update_res, "error", None):
            raise HTTPException(status_code=500, detail="Unable to reserve credits")

        updated_rows = getattr(update_res, "data", None) or []
        if updated_rows:
            ledger_payload = {
                "user_id": user_id,
                "change": -row_count,
                "amount": 0.0,
                "reason": f"job deduction: {job_id} ({deduction_source})",
                "ts": datetime.utcnow().isoformat(),
            }
            ledger_res = (
                supabase_client.table("ledger").insert(ledger_payload).execute()
            )
            if getattr(ledger_res, "error", None):
                supabase_client.table("profiles").update({
                    "credits_remaining": credits_remaining,
                    "addon_credits": addon_credits
                }).eq("id", user_id).execute()
                raise HTTPException(
                    status_code=500, detail="Unable to record credit deduction"
                )

            return {
                "previous_balance": credits_remaining + addon_credits,
                "new_balance": new_monthly + new_addon,
                "cost": row_count,
            }

        time.sleep(0.1)

    raise HTTPException(status_code=500, detail="Unable to reserve credits")


def _rollback_credit_reservation(
    supabase_client,
    user_id: str,
    reservation: Dict[str, int],
    job_id: str,
):
    try:
        supabase_client.table("profiles").update(
            {"credits_remaining": reservation["previous_balance"]}
        ).eq("id", user_id).eq("credits_remaining", reservation["new_balance"]).execute()
        supabase_client.table("ledger").insert(
            {
                "user_id": user_id,
                "change": reservation["cost"],
                "amount": 0.0,
                "reason": f"job rollback: {job_id}",
                "ts": datetime.utcnow().isoformat(),
            }
        ).execute()
    except Exception as exc:  # pragma: no cover - logging for rollback issues
        print(f"[Credits] Failed to rollback reservation for job {job_id}: {exc}")


@app.post("/jobs")
async def create_job(
    req: JobRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    supabase = get_supabase()
    reservation: Optional[Dict[str, int]] = None
    lock = None
    acquired = False

    try:
        file_path = assert_user_owns_path(req.file_path, current_user.user_id)

        email_col = (req.email_col or "").strip()
        if not email_col:
            raise HTTPException(status_code=400, detail="email_col required")

        temp_path = await stream_input_to_tempfile(supabase, file_path)
        try:
            if file_path.lower().endswith(".xlsx"):
                row_count = count_xlsx_rows(temp_path)
            else:
                row_count = count_csv_rows(temp_path)
        finally:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

        job_id = str(uuid.uuid4())

        # Convert service to JSON string if it's a ServiceComponents object
        if isinstance(req.service, ServiceComponents):
            service_str = req.service.model_dump_json()
        elif isinstance(req.service, str):
            # Try to parse as JSON to validate structure, or keep as plain string
            try:
                json.loads(req.service)
                service_str = req.service
            except json.JSONDecodeError:
                # Legacy plain string - keep as is
                service_str = req.service
        else:
            service_str = json.dumps(req.service)

        meta = {
            "file_path": file_path,
            "email_col": email_col,
            "service": service_str,
            "total_rows": row_count,  # Cache row count to avoid re-counting in worker
        }

        lock_name = f"credits_lock:{current_user.user_id}"
        lock = redis_conn.lock(lock_name, timeout=30, blocking_timeout=10)
        acquired = lock.acquire(blocking=True)
        if not acquired:
            raise HTTPException(status_code=503, detail="Unable to reserve credits")

        reservation = _reserve_credits_for_job(
            supabase,
            current_user.user_id,
            row_count,
            job_id,
            file_path,
        )

        meta.update(
            {
                "credit_cost": row_count,
                "credits_deducted": True,
                "credits_refunded": False,
            }
        )

        result = (
            supabase.table("jobs")
            .insert(
                {
                    "id": job_id,
                    "user_id": current_user.user_id,
                    "status": "queued",
                    "filename": os.path.basename(file_path),
                    "rows": row_count,
                    "meta_json": meta,
                }
            )
            .execute()
        )

        if not result.data:
            raise RuntimeError("Failed to insert job")

        job = result.data[0]

        # Publish job notification to Redis for instant worker pickup
        jobs.publish_job_notification(job["id"])

        return {"id": job["id"], "status": job["status"], "rows": row_count}

    except HTTPException:
        if reservation is not None:
            _rollback_credit_reservation(
                supabase, current_user.user_id, reservation, job_id
            )
        raise
    except FileStreamingError as exc:
        if reservation is not None:
            _rollback_credit_reservation(
                supabase, current_user.user_id, reservation, job_id
            )
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as e:
        if reservation is not None:
            _rollback_credit_reservation(
                supabase, current_user.user_id, reservation, job_id
            )
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if lock is not None and acquired:
            try:
                lock.release()
            except Exception:
                pass




@app.get("/jobs/{job_id}")
def get_job(
    job_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    supabase = get_supabase()
    user_id = current_user.user_id

    job_res = (
        supabase.table("jobs")
        .select("*")
        .eq("id", job_id)
        .single()
        .execute()
    )
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")

    job = job_res.data
    if job["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    logs_res = (
        supabase.table("job_logs")
        .select("*")
        .eq("job_id", job_id)
        .order("step", desc=True)
        .limit(1)
        .execute()
    )
    last_log = logs_res.data[0] if logs_res.data else None

    if last_log:
        step = last_log["step"]
        total = last_log["total"] or 1
        job["progress"] = int((step / total) * 100)
        job["message"] = last_log.get("message")
    else:
        job["progress"] = 0
        job["message"] = None

    return job


@app.get("/jobs/{job_id}/download")
async def download_result(
    job_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    supabase = get_supabase()

    job = (
        supabase.table("jobs")
        .select("user_id,result_path")
        .eq("id", job_id)
        .single()
        .execute()
    )

    if not job.data or not job.data.get("result_path"):
        raise HTTPException(status_code=404, detail="Result not found")

    if job.data.get("user_id") != current_user.user_id:
        raise HTTPException(status_code=403)

    storage_path = job.data["result_path"]
    file = supabase.storage.from_("outputs").download(storage_path)
    return StreamingResponse(
        io.BytesIO(file),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=result.xlsx"
        },
    )


class PreviewEmailsRequest(BaseModel):
    file_path: str
    email_col: str

class GeneratePreviewRequest(BaseModel):
    file_path: str
    email_col: str
    selected_email: str
    service: str  # JSON string of service components


@app.post("/preview/emails")
async def get_preview_emails(
    payload: PreviewEmailsRequest = Body(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Extract first 5 emails from the uploaded file for preview selection."""
    try:
        file_path = payload.file_path
        email_col = payload.email_col

        if not file_path or not email_col:
            raise HTTPException(status_code=400, detail="file_path and email_col required")

        # Verify user owns the file
        file_path = assert_user_owns_path(file_path, current_user.user_id)

        supabase_client = get_supabase()
        temp_path = await stream_input_to_tempfile(supabase_client, file_path)

        try:
            emails = []
            if file_path.lower().endswith(".xlsx"):
                from openpyxl import load_workbook
                workbook = load_workbook(temp_path, read_only=True)
                sheet = workbook.active
                rows_iter = sheet.iter_rows(values_only=True)

                # Get header row
                header_row = next(rows_iter, None)
                if not header_row:
                    raise HTTPException(status_code=400, detail="Empty file")

                headers = ["" if cell is None else str(cell) for cell in header_row]
                if email_col not in headers:
                    raise HTTPException(status_code=400, detail=f"Column '{email_col}' not found")

                email_col_idx = headers.index(email_col)

                # Extract emails for preview
                for i, row in enumerate(rows_iter):
                    if row and len(row) > email_col_idx:
                        email_value = row[email_col_idx]
                        if email_value:
                            emails.append(str(email_value))

                workbook.close()
            else:
                # CSV file
                import csv
                with open(temp_path, newline="", encoding="utf-8-sig") as handle:
                    reader = csv.DictReader(handle)
                    if email_col not in (reader.fieldnames or []):
                        raise HTTPException(status_code=400, detail=f"Column '{email_col}' not found")

                    for i, row in enumerate(reader):
                        email_value = row.get(email_col, "")
                        if email_value:
                            emails.append(email_value)

            return {"emails": emails}
        finally:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

    except HTTPException:
        raise
    except FileStreamingError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as e:
        print(f"[Preview] Unexpected error in get_preview_emails: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/preview/generate")
async def generate_preview(
    payload: GeneratePreviewRequest = Body(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Generate a preview email using the full pipeline (SERP + 3 Groq calls) and deduct 1 credit."""
    from .research import perform_research
    from .gpt_helpers import generate_full_email_body
    from .email_cleaning import clean_email_body

    try:
        selected_email = payload.selected_email
        service_context = payload.service

        if not selected_email or "@" not in selected_email:
            raise HTTPException(status_code=400, detail="Valid email required")

        # Verify user owns the file
        file_path = assert_user_owns_path(payload.file_path, current_user.user_id)

        # Deduct 1 credit using the same atomic pattern
        supabase_client = get_supabase()
        user_id = current_user.user_id

        # Atomic credit deduction
        max_attempts = 5
        credit_deducted = False
        for attempt in range(max_attempts):
            profile_res = (
                supabase_client.table("profiles")
                .select("credits_remaining")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            profile = _parse_profile_response(profile_res) or {}
            try:
                credits_remaining = int(profile.get("credits_remaining") or 0)
            except (TypeError, ValueError):
                credits_remaining = 0

            if credits_remaining < 1:
                raise HTTPException(
                    status_code=402,
                    detail={
                        "error": "insufficient_credits",
                        "credits_remaining": credits_remaining,
                        "message": "You need at least 1 credit to generate a preview"
                    }
                )

            new_balance = credits_remaining - 1
            update_res = (
                supabase_client.table("profiles")
                .update({"credits_remaining": new_balance})
                .eq("id", user_id)
                .eq("credits_remaining", credits_remaining)
                .execute()
            )

            if getattr(update_res, "error", None):
                raise HTTPException(status_code=500, detail="Unable to deduct credits")

            updated_rows = getattr(update_res, "data", None) or []
            if updated_rows:
                # Record ledger entry
                ledger_payload = {
                    "user_id": user_id,
                    "change": -1,
                    "amount": 0.0,
                    "reason": "preview generation",
                    "ts": datetime.utcnow().isoformat(),
                }
                ledger_res = (
                    supabase_client.table("ledger").insert(ledger_payload).execute()
                )
                if getattr(ledger_res, "error", None):
                    # Rollback credit deduction
                    supabase_client.table("profiles").update(
                        {"credits_remaining": credits_remaining}
                    ).eq("id", user_id).execute()
                    raise HTTPException(
                        status_code=500, detail="Unable to record credit deduction"
                    )

                credit_deducted = True
                break

            time.sleep(0.1)

        if not credit_deducted:
            raise HTTPException(status_code=500, detail="Unable to deduct credits")

        # Run the exact same pipeline as the main job
        print(f"\n[Preview] Generating preview for email: {selected_email}")

        # Step 1: Research (SERP + Groq synthesis)
        research_components = perform_research(selected_email)
        print(f"\n📋 PREVIEW RESEARCH COMPONENTS:")
        print(research_components)

        # Step 2: Email generation (Groq)
        email_body = generate_full_email_body(
            research_components,
            service_context,
        )
        print(f"\n✉️  PREVIEW EMAIL BODY (before cleaning):")
        print(email_body)

        # Step 3: Cleaning (Groq)
        email_body = clean_email_body(email_body)
        print(f"\n🧹 PREVIEW CLEANED EMAIL BODY:")
        print(email_body)

        return {
            "email": selected_email,
            "research_components": research_components,
            "email_body": email_body,
            "credits_remaining": new_balance
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Preview] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/jobs/{job_id}/progress")
def job_progress(
    job_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    supabase = get_supabase()
    user_id = current_user.user_id

    job_res = (
        supabase.table("jobs")
        .select("id,user_id,status")
        .eq("id", job_id)
        .single()
        .execute()
    )
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")

    job = job_res.data
    if job["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    logs_res = (
        supabase.table("job_logs")
        .select("*")
        .eq("job_id", job_id)
        .order("step", desc=True)
        .limit(1)
        .execute()
    )
    last_log = logs_res.data[0] if logs_res.data else None

    if last_log:
        step = last_log["step"]
        total = last_log["total"] or 1
        percent = int((step / total) * 100)
        message = last_log.get("message")
    else:
        percent = 0
        message = None

    return {
        "job_id": job_id,
        "status": job["status"],
        "percent": percent,
        "message": message,
    }


# WebSocket endpoint for real-time job progress
@app.websocket("/ws/jobs/{job_id}")
async def websocket_job_progress(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for real-time job progress updates.
    Authenticates via query param 'token', then subscribes to Redis pub/sub
    for live updates on the specified job.
    """
    # Check if WebSocket is enabled via feature flag
    enable_websocket = os.getenv("ENABLE_WEBSOCKET", "true").lower() == "true"
    if not enable_websocket:
        await websocket.close(code=1008, reason="WebSocket not enabled")
        return

    # Extract token from query params
    query_params = dict(websocket.query_params)
    token = query_params.get("token")

    if not token:
        await websocket.close(code=1008, reason="Missing authentication token")
        return

    # Validate JWT token
    try:
        secret = os.getenv("SUPABASE_JWT_SECRET")
        if not secret:
            await websocket.close(code=1011, reason="Server configuration error")
            return

        supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        issuer = os.getenv("SUPABASE_JWT_ISS", f"{supabase_url}/auth/v1" if supabase_url else None)
        audience = os.getenv("SUPABASE_JWT_AUD", "authenticated")

        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            issuer=issuer,
            audience=audience,
            options={"verify_exp": True},
        )
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008, reason="Invalid token")
            return

    except ExpiredSignatureError:
        await websocket.close(code=1008, reason="Token expired")
        return
    except (InvalidTokenError, InvalidAudienceError, InvalidIssuerError) as e:
        await websocket.close(code=1008, reason="Invalid token")
        return
    except Exception as e:
        logging.error(f"WebSocket auth error: {e}")
        await websocket.close(code=1011, reason="Authentication failed")
        return

    # Verify user owns this job
    try:
        supabase_client = get_supabase()
        job_res = (
            supabase_client.table("jobs")
            .select("id,user_id,status")
            .eq("id", job_id)
            .single()
            .execute()
        )
        if not job_res.data:
            await websocket.close(code=1008, reason="Job not found")
            return

        job = job_res.data
        if job["user_id"] != user_id:
            await websocket.close(code=1008, reason="Unauthorized")
            return
    except Exception as e:
        logging.error(f"WebSocket job verification error: {e}")
        await websocket.close(code=1011, reason="Verification failed")
        return

    # Accept the WebSocket connection
    await websocket.accept()

    # Create Redis pub/sub connection
    pubsub = redis_conn.pubsub()
    channel = f"job_progress:{job_id}"

    try:
        # Subscribe to job progress channel
        pubsub.subscribe(channel)

        # Send initial status
        initial_status = {
            "job_id": job_id,
            "status": job["status"],
            "percent": 0,
            "message": "Connected to job progress stream",
        }
        await websocket.send_json(initial_status)

        # Listen for Redis pub/sub messages in a background task
        async def listen_redis():
            """Listen to Redis pub/sub and forward to WebSocket"""
            loop = asyncio.get_event_loop()

            while True:
                # Run blocking Redis get_message in executor
                message = await loop.run_in_executor(
                    None,
                    pubsub.get_message,
                    True,  # ignore_subscribe_messages
                    1.0    # timeout in seconds
                )

                if message and message['type'] == 'message':
                    try:
                        # Parse the Redis message data
                        data = json.loads(message['data'])
                        await websocket.send_json(data)

                        # If job is complete, close connection
                        if data.get('status') in ['succeeded', 'failed']:
                            await asyncio.sleep(1)  # Give client time to receive final message
                            break
                    except json.JSONDecodeError:
                        logging.error(f"Failed to parse Redis message: {message['data']}")
                    except Exception as e:
                        logging.error(f"Error sending WebSocket message: {e}")
                        break

                await asyncio.sleep(0.1)  # Small delay to prevent tight loop

        # Run the Redis listener
        await listen_redis()

    except WebSocketDisconnect:
        logging.info(f"WebSocket disconnected for job {job_id}")
    except Exception as e:
        logging.error(f"WebSocket error for job {job_id}: {e}")
    finally:
        # Clean up
        try:
            pubsub.unsubscribe(channel)
            pubsub.close()
        except:
            pass

        try:
            await websocket.close()
        except:
            pass


# ✅ Stripe Checkout Session (subscription OR add-on)
class CheckoutRequest(BaseModel):
    plan: str
    addon: bool = False
    quantity: int = 1

# ========================
# /create_checkout_session
# ========================
@app.post("/create_checkout_session")
async def create_checkout_session(
    data: CheckoutRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    try:
        print("========== CREATE CHECKOUT SESSION ==========")
        print(f"[DEBUG] Incoming data: {data}")
        user_id = current_user.user_id
        user_email = current_user.claims.get("email")

        if not STRIPE_SECRET:
            raise HTTPException(status_code=500, detail="Stripe is not configured")

        stripe_customer_id = ensure_stripe_customer_id(user_id, email=user_email)
        if not stripe_customer_id:
            raise HTTPException(status_code=500, detail="Unable to create Stripe customer")

        line_items = []
        price_id = None
        mode = "subscription"

        if data.addon:
            addon_price_id = ADDON_PRICE_MAP.get(data.plan)
            if not addon_price_id:
                print(f"[ERROR] Invalid addon plan: {data.plan}")
                return {"error": "Invalid addon plan"}
            price_id = addon_price_id
            line_items = [
                {
                    "price": addon_price_id,
                    "quantity": data.quantity,
                }
            ]
            mode = "payment"
        else:
            price_id = PLAN_PRICE_MAP.get(data.plan)
            if not price_id:
                print(f"[ERROR] Invalid plan: {data.plan}")
                return {"error": "Invalid plan"}
            line_items = [
                {
                    "price": price_id,
                    "quantity": 1,
                }
            ]
            mode = "subscription"

        print(
            f"[INFO] Using price_id={price_id}, mode={mode}, user_id={user_id}, customer={stripe_customer_id}"
        )

        session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            payment_method_types=["card"],
            mode=mode,
            line_items=line_items,
            success_url=SUCCESS_URL,
            cancel_url=CANCEL_URL,
            metadata={
                "user_id": user_id,
                "plan": data.plan,
                "addon": str(data.addon).lower(),
                "quantity": str(data.quantity),
            },
            subscription_data=None
            if data.addon
            else {
                "metadata": {
                    "user_id": user_id,
                    "plan": data.plan,
                }
            },
        )

        print(f"[INFO] Created Checkout Session: {session['id']}")
        print("========== END CREATE CHECKOUT SESSION ==========")

        return {"id": session.id}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] create_checkout_session failed: {e}")
        return {"error": str(e)}



@app.post("/stripe/sync")
async def trigger_stripe_sync(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    if not STRIPE_SECRET:
        raise HTTPException(status_code=500, detail="Stripe is not configured")

    user_id = current_user.user_id
    stripe_customer_id = ensure_stripe_customer_id(
        user_id, email=current_user.claims.get("email")
    )

    if not stripe_customer_id:
        raise HTTPException(status_code=400, detail="Stripe customer missing")

    sync_result = sync_stripe_customer(stripe_customer_id, user_id=user_id)
    return {
        "status": "ok",
        "customerId": stripe_customer_id,
        "subscription": sync_result.get("subscription"),
    }



# Init Supabase (must be service role key)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

def log_db(label, res):
    print(f"[DB:{label}] {res}")

def _is_event_processed(event_id: str) -> bool:
    """Check if a Stripe event has already been processed (idempotency check)"""
    try:
        result = (
            supabase.table("processed_stripe_events")
            .select("event_id")
            .eq("event_id", event_id)
            .maybeSingle()
            .execute()
        )
        return result.data is not None
    except Exception as e:
        print(f"[IDEMPOTENCY] Error checking event {event_id}: {e}")
        # If table doesn't exist or error, allow processing (fail open)
        return False

def _mark_event_processed(event_id: str, event_type: str) -> None:
    """Mark a Stripe event as processed"""
    try:
        supabase.table("processed_stripe_events").insert({
            "event_id": event_id,
            "event_type": event_type,
            "processed_at": datetime.utcnow().isoformat(),
        }).execute()
    except Exception as e:
        print(f"[IDEMPOTENCY] Error marking event {event_id}: {e}")

def _verify_payment_status(obj) -> bool:
    """Verify that payment was actually successful"""
    # For checkout sessions
    if obj.get("object") == "checkout.session":
        payment_status = obj.get("payment_status")
        return payment_status == "paid"

    # For invoices
    if obj.get("object") == "invoice":
        status = obj.get("status")
        paid = obj.get("paid")
        return status == "paid" and paid == True

    return False

@app.post("/stripe-webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    print("========== STRIPE WEBHOOK ==========")

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        print(f"[ERROR] Webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    event_type = event["type"]
    obj = event["data"]["object"]
    event_id = event["id"]
    print(f"[EVENT] {event_type} id={event_id}")

    # Idempotency check - prevent processing the same event twice
    if _is_event_processed(event_id):
        print(f"[IDEMPOTENCY] Event {event_id} already processed, skipping")
        return {"status": "duplicate", "event_id": event_id}

    def log_db(label, res):
        print(f"[DB:{label}] {res}")

    metadata = obj.get("metadata", {}) if hasattr(obj, "get") else {}
    if hasattr(metadata, "to_dict"):
        metadata = metadata.to_dict()
    customer_id = obj.get("customer") if hasattr(obj, "get") else None
    linked_user_id: Optional[str] = None

    # Payment verification - ensure payment was actually successful before granting credits
    payment_verified = _verify_payment_status(obj)
    if event_type in ["checkout.session.completed", "invoice.paid"] and not payment_verified:
        print(f"[WARNING] Payment not verified for event {event_id}, skipping credit allocation")
        _mark_event_processed(event_id, event_type)
        return {"status": "payment_not_verified", "event_id": event_id}

    if event_type == "checkout.session.completed":
        user_id = metadata.get("user_id")
        plan = metadata.get("plan")
        linked_user_id = user_id

        # CRITICAL: Validate user_id exists
        if not user_id:
            print(f"[ERROR] No user_id in checkout.session.completed metadata for event {event_id}")
            _mark_event_processed(event_id, event_type)
            return {"status": "error", "message": "missing_user_id"}

        if customer_id and user_id:
            _update_profile(user_id, {"stripe_customer_id": customer_id})

        if metadata.get("addon") == "true":
            qty = int(metadata.get("quantity", 1))
            credits = qty * 1000
            try:
                # Add to addon_credits (separate bucket, preserved through renewals)
                current = (
                    supabase.table("profiles")
                    .select("addon_credits")
                    .eq("id", user_id)
                    .single()
                    .execute()
                )
                current_addon = current.data.get("addon_credits") if current.data else 0
                new_addon_total = (current_addon or 0) + credits

                res_update = (
                    supabase.table("profiles")
                    .update({"addon_credits": new_addon_total})
                    .eq("id", user_id)
                    .execute()
                )
                log_db("update_addon_credits", res_update)

                res_ledger = (
                    supabase.table("ledger")
                    .insert(
                        {
                            "user_id": user_id,
                            "change": credits,
                            "amount": (obj.get("amount_total") or 0) / 100.0,
                            "reason": f"addon purchase x{qty}",
                            "ts": datetime.utcnow().isoformat(),
                        }
                    )
                    .execute()
                )
                log_db("insert_ledger_addon", res_ledger)
            except Exception as exc:  # pragma: no cover - supabase availability
                print(f"[Stripe] Failed to record add-on purchase: {exc}")

            print(
                f"[ADDON] user={user_id}, qty={qty}, credits={credits}, customer={customer_id}"
            )
        else:
            # Validate plan exists
            if plan not in CREDITS_MAP:
                print(f"[ERROR] Invalid plan '{plan}' in checkout.session.completed for event {event_id}")
                _mark_event_processed(event_id, event_type)
                return {"status": "error", "message": "invalid_plan"}

            subscription_id = obj.get("subscription")
            renewal_date = None
            if subscription_id:
                subscription = stripe.Subscription.retrieve(subscription_id)
                renewal_date = subscription.get("current_period_end")

            credits = CREDITS_MAP.get(plan, 0)
            try:
                res_update = (
                    supabase.table("profiles")
                    .update(
                        {
                            "plan_type": plan,
                            "subscription_status": "active",
                            "renewal_date": renewal_date,
                            "credits_remaining": credits,
                        }
                    )
                    .eq("id", user_id)
                    .execute()
                )
                log_db("update_profile_plan", res_update)

                res_ledger = (
                    supabase.table("ledger")
                    .insert(
                        {
                            "user_id": user_id,
                            "change": credits,
                            "amount": (obj.get("amount_total") or 0) / 100.0,
                            "reason": f"plan purchase - {plan}",
                            "ts": datetime.utcnow().isoformat(),
                        }
                    )
                    .execute()
                )
                log_db("insert_ledger_plan", res_ledger)
            except Exception as exc:  # pragma: no cover - supabase availability
                print(f"[Stripe] Failed to update plan purchase: {exc}")

            print(
                f"[PLAN] user={user_id}, plan={plan}, credits={credits}, renewal={renewal_date}"
            )

    # Handle monthly renewals (invoice.paid event)
    elif event_type == "invoice.paid":
        # Get subscription details from the invoice
        subscription_id = obj.get("subscription")
        billing_reason = obj.get("billing_reason")

        # Skip initial subscription invoice (already handled by checkout.session.completed)
        if billing_reason == "subscription_create":
            print(f"[INVOICE] Skipping subscription_create invoice (already handled by checkout)")
        elif not subscription_id:
            print(f"[INVOICE] No subscription_id in invoice, skipping")
        else:
            try:
                # Retrieve subscription to get metadata with user_id
                subscription = stripe.Subscription.retrieve(subscription_id)
                sub_metadata = subscription.get("metadata", {})
                user_id = sub_metadata.get("user_id")

                if not user_id and customer_id:
                    # Fallback: find user by customer_id
                    user_id = _find_user_by_customer(customer_id)

                if not user_id:
                    print(f"[INVOICE] Could not find user_id for subscription {subscription_id}")
                else:
                    linked_user_id = user_id

                    # Get the user's current plan
                    profile = (
                        supabase.table("profiles")
                        .select("plan_type, subscription_status")
                        .eq("id", user_id)
                        .single()
                        .execute()
                    )

                    if not profile.data:
                        print(f"[INVOICE] Profile not found for user {user_id}")
                    else:
                        plan_type = profile.data.get("plan_type", "free")
                        subscription_status = profile.data.get("subscription_status")

                        # For plan changes, get the new plan from subscription
                        if billing_reason == "subscription_update":
                            # Get plan from subscription items
                            items = subscription.get("items", {}).get("data", [])
                            if items:
                                price_id = items[0].get("price", {}).get("id")
                                new_plan = PRICE_TO_PLAN.get(price_id, plan_type)
                                if new_plan != plan_type:
                                    print(f"[UPGRADE/DOWNGRADE] {plan_type} → {new_plan}")
                                    plan_type = new_plan

                        # Only reset credits for active subscriptions with paid plans
                        if subscription_status == "active" and plan_type in CREDITS_MAP:
                            # RESET credits to monthly allocation (not add)
                            monthly_credits = CREDITS_MAP.get(plan_type, 0)

                            # Determine ledger reason based on billing_reason
                            if billing_reason == "subscription_update":
                                ledger_reason = f"plan change - {plan_type}"
                            else:
                                ledger_reason = f"monthly renewal - {plan_type}"

                            res_update = (
                                supabase.table("profiles")
                                .update({
                                    "credits_remaining": monthly_credits,
                                    "plan_type": plan_type,  # Update plan for upgrades/downgrades
                                })
                                .eq("id", user_id)
                                .execute()
                            )
                            log_db("reset_monthly_credits", res_update)

                            # Record in ledger
                            invoice_amount = (obj.get("amount_paid") or 0) / 100.0
                            res_ledger = (
                                supabase.table("ledger")
                                .insert({
                                    "user_id": user_id,
                                    "change": monthly_credits,
                                    "amount": invoice_amount,
                                    "reason": ledger_reason,
                                    "ts": datetime.utcnow().isoformat(),
                                })
                                .execute()
                            )
                            log_db("insert_ledger_renewal", res_ledger)

                            print(
                                f"[RENEWAL] user={user_id}, plan={plan_type}, "
                                f"credits_reset_to={monthly_credits}, amount=${invoice_amount}, "
                                f"reason={billing_reason}"
                            )
                        else:
                            print(
                                f"[INVOICE] Skipping credit reset for user {user_id}: "
                                f"status={subscription_status}, plan={plan_type}"
                            )
            except Exception as exc:
                print(f"[INVOICE] Error processing monthly renewal: {exc}")

    # Handle subscription cancellation
    elif event_type == "customer.subscription.deleted":
        subscription_id = obj.get("id")
        sub_metadata = obj.get("metadata", {})
        user_id = sub_metadata.get("user_id")

        if not user_id and customer_id:
            user_id = _find_user_by_customer(customer_id)

        if user_id:
            linked_user_id = user_id
            try:
                res_update = (
                    supabase.table("profiles")
                    .update({
                        "subscription_status": "canceled",
                        "plan_type": "free",
                    })
                    .eq("id", user_id)
                    .execute()
                )
                log_db("cancel_subscription", res_update)

                print(f"[CANCELED] user={user_id}, subscription={subscription_id}")
            except Exception as exc:
                print(f"[CANCEL] Error updating canceled subscription: {exc}")
        else:
            print(f"[CANCEL] Could not find user_id for subscription {subscription_id}, skipping")

    if event_type in STRIPE_SYNC_EVENTS and customer_id:
        sync_result = sync_stripe_customer(customer_id, user_id=linked_user_id)
        print(f"[SYNC] {sync_result}")

    # Mark event as processed to prevent duplicate processing
    _mark_event_processed(event_id, event_type)

    print("========== END WEBHOOK ==========")
    return {"status": "success"}
