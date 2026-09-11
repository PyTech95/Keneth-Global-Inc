"""Keneth Global — FastAPI backend.
E-commerce API: products, cart, orders, Stripe (Flow B), auth, admin, AI image gen.
"""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_optional_user,
    require_admin,
    seed_admin,
    _sanitize_user,
)
from seed_catalog import CATALOG
from image_gen import generate_images_for_products, generate_product_image, reconcile_static_images, STATIC_DIR
from extra_routes import extra_router, seed_journal, generate_journal_covers, generate_gallery_for_products

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ---------------- Mongo ----------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------------- FastAPI ----------------
app = FastAPI(title="Keneth Global API")
api = APIRouter(prefix="/api")

# Serve generated product images under /api/static/*
STATIC_ROOT = ROOT_DIR / "static"
STATIC_ROOT.mkdir(exist_ok=True)
app.mount("/api/static", StaticFiles(directory=str(STATIC_ROOT)), name="static")


# ================== HELPERS ==================
def doc_to_product(doc: dict) -> dict:
    """Convert mongo product doc to API-serializable dict."""
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    if isinstance(d.get("created_at"), datetime):
        d["created_at"] = d["created_at"].isoformat()
    return d


def doc_to_order(doc: dict) -> dict:
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    for k in ("created_at", "updated_at"):
        if isinstance(d.get(k), datetime):
            d[k] = d[k].isoformat()
    return d


# ================== AUTH ==================
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@api.post("/auth/register")
async def register(payload: RegisterIn):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip(),
        "role": "customer",
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    user_id = str(res.inserted_id)
    token = create_access_token(user_id, email, "customer")
    doc["_id"] = res.inserted_id
    return {"token": token, "user": _sanitize_user(doc)}


@api.post("/auth/login")
async def login(payload: LoginIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(str(user["_id"]), email, user.get("role", "customer"))
    return {"token": token, "user": _sanitize_user(user)}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ================== PRODUCTS ==================
@api.get("/products")
async def list_products(vertical: Optional[str] = None, category: Optional[str] = None, q: Optional[str] = None, limit: int = 100):
    query = {"active": {"$ne": False}}
    if vertical:
        query["vertical"] = vertical
    if category:
        query["category"] = category
    if q:
        query["$or"] = [
            {"name.en": {"$regex": q, "$options": "i"}},
            {"slug": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.products.find(query).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [doc_to_product(d) for d in docs]


@api.get("/products/verticals")
async def verticals():
    """Return counts by vertical + category."""
    pipeline = [
        {"$match": {"active": {"$ne": False}}},
        {"$group": {"_id": {"v": "$vertical", "c": "$category"}, "count": {"$sum": 1}}},
    ]
    result = await db.products.aggregate(pipeline).to_list(length=None)
    tree = {}
    for r in result:
        v = r["_id"]["v"]
        c = r["_id"]["c"]
        tree.setdefault(v, {"total": 0, "categories": {}})
        tree[v]["categories"][c] = r["count"]
        tree[v]["total"] += r["count"]
    return tree


@api.get("/products/{slug}")
async def get_product(slug: str):
    doc = await db.products.find_one({"slug": slug, "active": {"$ne": False}})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return doc_to_product(doc)


# ================== CART / CHECKOUT (Stripe Flow B) ==================
class CartItemIn(BaseModel):
    slug: str
    quantity: int = Field(ge=1, le=50)


class CheckoutIn(BaseModel):
    items: List[CartItemIn]
    origin_url: str
    email: Optional[str] = None
    gift_wrap: bool = False
    gift_message: Optional[str] = None


@api.post("/checkout/session")
async def create_checkout(payload: CheckoutIn, user=Depends(get_optional_user)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

    stripe_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe key not configured")

    # Compute total server-side (never trust frontend amount)
    total = 0.0
    order_items = []
    for item in payload.items:
        product = await db.products.find_one({"slug": item.slug, "active": {"$ne": False}})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product not found: {item.slug}")
        price = float(product["price_eur"])
        line_total = price * item.quantity
        total += line_total
        order_items.append({
            "slug": item.slug,
            "product_id": str(product["_id"]),
            "name_en": product["name"]["en"],
            "quantity": item.quantity,
            "unit_price": price,
            "line_total": line_total,
        })

    # Premium gift wrap (flat fee, server-controlled)
    GIFT_WRAP_FEE_EUR = 5.0
    gift_wrap = bool(payload.gift_wrap)
    gift_message = (payload.gift_message or "").strip()[:500]
    if gift_wrap:
        total += GIFT_WRAP_FEE_EUR

    total = round(total, 2)

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment/cancel"

    # Webhook target is pinned server-side (never trust the client-supplied origin
    # for payment webhook routing); falls back to origin only if unset.
    webhook_base = os.environ.get("PUBLIC_BASE_URL", origin).rstrip("/")
    stripe_checkout = StripeCheckout(
        api_key=stripe_key,
        webhook_url=f"{webhook_base}/api/webhook/stripe",
    )

    metadata = {
        "user_id": user["id"] if user else "guest",
        "item_count": str(len(order_items)),
        "gift_wrap": str(gift_wrap),
    }
    req = CheckoutSessionRequest(
        amount=total,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe_checkout.create_checkout_session(req)

    order_doc = {
        "session_id": session.session_id,
        "user_id": user["id"] if user else None,
        "email": (user["email"] if user else payload.email) or "",
        "items": order_items,
        "amount": total,
        "currency": "eur",
        "status": "initiated",
        "payment_status": "pending",
        "gift_wrap": gift_wrap,
        "gift_message": gift_message,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.orders.insert_one(order_doc)

    return {"checkout_url": session.url, "session_id": session.session_id}


@api.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    stripe_key = os.environ.get("STRIPE_API_KEY")
    order = await db.orders.find_one({"session_id": session_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # Poll Stripe if still pending
    if order.get("payment_status") != "paid":
        try:
            sc = StripeCheckout(api_key=stripe_key, webhook_url="")
            status = await sc.get_checkout_status(session_id)
            if status.payment_status == "paid" or status.status == "complete":
                await db.orders.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {
                        "status": "completed",
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc),
                    }},
                )
                order = await db.orders.find_one({"session_id": session_id})
        except Exception as e:
            logger.warning(f"Stripe status poll failed: {e}")
    return {
        "session_id": order["session_id"],
        "status": order["status"],
        "payment_status": order["payment_status"],
        "amount": order["amount"],
        "currency": order["currency"],
    }


@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    stripe_key = os.environ.get("STRIPE_API_KEY")
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        sc = StripeCheckout(api_key=stripe_key, webhook_url="")
        event = await sc.handle_webhook(body, sig)
    except Exception as e:
        logger.error(f"Webhook parse failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")
    if event and event.session_id:
        await db.orders.update_one(
            {"session_id": event.session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {
                "status": "completed" if event.payment_status == "paid" else event.payment_status,
                "payment_status": event.payment_status,
                "updated_at": datetime.now(timezone.utc),
            }},
        )
    return {"status": "ok"}


# ================== ORDERS ==================
@api.get("/orders/mine")
async def my_orders(user=Depends(get_current_user)):
    cursor = db.orders.find({"user_id": user["id"]}).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return [doc_to_order(d) for d in docs]


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user=Depends(get_current_user)):
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order id")
    doc = await db.orders.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.get("role") != "admin" and doc.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return doc_to_order(doc)


# ================== ADMIN ==================
@api.get("/admin/orders")
async def admin_orders(admin=Depends(require_admin)):
    cursor = db.orders.find().sort("created_at", -1).limit(200)
    docs = await cursor.to_list(length=200)
    return [doc_to_order(d) for d in docs]


@api.get("/admin/users")
async def admin_users(admin=Depends(require_admin)):
    docs = await db.users.find().sort("created_at", -1).limit(500).to_list(length=500)
    return [_sanitize_user(d) for d in docs]


@api.get("/admin/stats")
async def admin_stats(admin=Depends(require_admin)):
    total_products = await db.products.count_documents({"active": {"$ne": False}})
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({"payment_status": "paid"})
    total_users = await db.users.count_documents({})
    revenue_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    rev = await db.orders.aggregate(revenue_pipeline).to_list(length=1)
    revenue = rev[0]["total"] if rev else 0
    return {
        "products": total_products,
        "orders": total_orders,
        "paid_orders": paid_orders,
        "users": total_users,
        "revenue_eur": round(revenue, 2),
    }


class ProductPatch(BaseModel):
    price_eur: Optional[float] = None
    active: Optional[bool] = None
    badge: Optional[dict] = None


@api.patch("/admin/products/{product_id}")
async def update_product(product_id: str, patch: ProductPatch, admin=Depends(require_admin)):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    updates = {k: v for k, v in patch.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    updates["updated_at"] = datetime.now(timezone.utc)
    await db.products.update_one({"_id": oid}, {"$set": updates})
    doc = await db.products.find_one({"_id": oid})
    return doc_to_product(doc)


@api.post("/admin/products/{product_id}/regenerate-image")
async def regenerate_image(product_id: str, bg: BackgroundTasks, admin=Depends(require_admin)):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    doc = await db.products.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    prompt = doc.get("image_prompt")
    if not prompt:
        raise HTTPException(status_code=400, detail="No image prompt")

    async def do_gen():
        path = await generate_product_image(prompt, doc.get("slug", ""))
        if path:
            await db.products.update_one({"_id": oid}, {"$set": {"ai_image": path}})

    bg.add_task(do_gen)
    return {"status": "queued"}


class OrderStatusPatch(BaseModel):
    status: str  # 'shipped' | 'delivered' | 'cancelled'


@api.patch("/admin/orders/{order_id}")
async def update_order(order_id: str, patch: OrderStatusPatch, admin=Depends(require_admin)):
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if patch.status not in {"initiated", "completed", "shipped", "delivered", "cancelled", "failed"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.orders.update_one(
        {"_id": oid},
        {"$set": {"status": patch.status, "updated_at": datetime.now(timezone.utc)}},
    )
    doc = await db.orders.find_one({"_id": oid})
    return doc_to_order(doc)


# ================== SEED ==================
async def seed_catalog(db):
    now = datetime.now(timezone.utc)
    for item in CATALOG:
        existing = await db.products.find_one({"slug": item["slug"]})
        base_doc = {
            **item,
            "active": True,
            "updated_at": now,
        }
        if existing is None:
            base_doc["created_at"] = now
            base_doc["ai_image"] = ""
            await db.products.insert_one(base_doc)
        else:
            # only update non-image editorial fields on re-seed
            await db.products.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "name": item["name"],
                    "short_description": item["short_description"],
                    "long_description": item["long_description"],
                    "price_eur": item["price_eur"],
                    "unit": item["unit"],
                    "vertical": item["vertical"],
                    "category": item["category"],
                    "image_prompt": item["image_prompt"],
                    "image_hint": item.get("image_hint", ""),
                    "badge": item.get("badge"),
                    "updated_at": now,
                }},
            )


# ================== STARTUP ==================
@app.on_event("startup")
async def on_startup():
    logger.info("Starting Keneth Global API...")
    # indexes
    await db.users.create_index("email", unique=True)
    await db.products.create_index("slug", unique=True)
    await db.products.create_index("vertical")
    await db.orders.create_index("session_id", unique=True)
    await db.orders.create_index("user_id")
    # seed
    await seed_admin(db)
    await seed_catalog(db)
    await seed_journal(db)
    # Reuse the curated PNGs bundled in static/products instead of
    # regenerating via the LLM key (saves cost, keeps exact images).
    await reconcile_static_images(db)
    logger.info("Seed + image reconcile complete.")
    # Only generate images for anything still missing after reconcile.
    async def _fill_missing():
        missing = await db.products.count_documents({"$or": [{"ai_image": {"$exists": False}}, {"ai_image": ""}]})
        journal_missing = await db.journal.count_documents({"$or": [{"cover_image": {"$exists": False}}, {"cover_image": ""}]})
        if missing:
            logger.info(f"{missing} products missing images -> generating")
            await generate_images_for_products(db)
        if journal_missing:
            await generate_journal_covers(db)
    asyncio.create_task(_fill_missing())


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


@api.get("/")
async def root():
    return {"status": "ok", "app": "Keneth Global API"}


@api.get("/health")
async def health():
    try:
        await db.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "db": db_ok}


# Register routes
app.include_router(api)
app.include_router(extra_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
