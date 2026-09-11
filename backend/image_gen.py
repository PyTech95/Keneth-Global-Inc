"""Gemini Nano Banana image generation for product catalog."""
import os
import base64
import uuid
import logging
import asyncio
from pathlib import Path

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent / "static" / "products"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

GEMINI_MODEL = "gemini-3.1-flash-image-preview"


async def generate_product_image(prompt: str, filename_hint: str = "") -> str:
    """Generate a product image using Gemini Nano Banana.
    Returns the relative static path (e.g. 'products/xyz.png') on success, or empty string on failure."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        logger.error(f"emergentintegrations import failed: {e}")
        return ""

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.error("EMERGENT_LLM_KEY missing")
        return ""

    session_id = f"img-{uuid.uuid4().hex[:12]}"
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message="You are a luxury product photographer generating editorial catalog images.",
        )
        chat.with_model("gemini", GEMINI_MODEL).with_params(modalities=["image", "text"])
        msg = UserMessage(text=prompt)
        _text, images = await chat.send_message_multimodal_response(msg)
        if not images:
            logger.warning(f"No image returned for prompt hint '{filename_hint}'")
            return ""
        img = images[0]
        image_bytes = base64.b64decode(img["data"])
        safe_hint = "".join(c for c in filename_hint if c.isalnum() or c in "-_")[:40] or "product"
        filename = f"{safe_hint}-{uuid.uuid4().hex[:8]}.png"
        filepath = STATIC_DIR / filename
        with open(filepath, "wb") as f:
            f.write(image_bytes)
        return f"products/{filename}"
    except Exception as e:
        logger.error(f"Image generation failed for '{filename_hint}': {e}")
        return ""


import re


async def reconcile_static_images(db):
    """Map bundled PNGs in static/products to product & journal docs so we
    reuse the curated images instead of regenerating them (saves LLM spend)."""
    try:
        files = [p.name for p in STATIC_DIR.glob("*.png")]
    except Exception as e:
        logger.warning(f"reconcile: cannot list static dir: {e}")
        return
    if not files:
        return

    # Products
    products = await db.products.find({}).to_list(length=None)
    for prod in products:
        slug = prod.get("slug", "")
        if not slug:
            continue
        updates = {}
        main_re = re.compile(rf"^{re.escape(slug)}-[0-9a-f]{{6,}}\.png$")
        gal_re = re.compile(rf"^{re.escape(slug)}-g\d+-[0-9a-f]{{6,}}\.png$")
        if not prod.get("ai_image"):
            main = next((f for f in files if main_re.match(f)), None)
            if main:
                updates["ai_image"] = f"products/{main}"
        if not prod.get("gallery_images"):
            gal = sorted(f for f in files if gal_re.match(f))
            if gal:
                updates["gallery_images"] = [f"products/{g}" for g in gal]
        if updates:
            await db.products.update_one({"_id": prod["_id"]}, {"$set": updates})
            logger.info(f"reconcile: {slug} -> {list(updates.keys())}")

    # Journal covers (files prefixed 'journal-{slug}-...')
    posts = await db.journal.find({}).to_list(length=None)
    for post in posts:
        if post.get("cover_image"):
            continue
        slug = post.get("slug", "")
        cover_re = re.compile(rf"^journal-{re.escape(slug)}-[0-9a-f]{{6,}}\.png$")
        cover = next((f for f in files if cover_re.match(f)), None)
        if cover:
            await db.journal.update_one({"_id": post["_id"]}, {"$set": {"cover_image": f"products/{cover}"}})
            logger.info(f"reconcile journal: {slug} -> products/{cover}")


async def generate_images_for_products(db, limit: int = None):
    """Background task: iterate products missing ai_image and generate them."""
    query = {"$or": [{"ai_image": {"$exists": False}}, {"ai_image": ""}]}
    cursor = db.products.find(query)
    products = await cursor.to_list(length=None)
    if limit:
        products = products[:limit]
    logger.info(f"Generating AI images for {len(products)} products")
    for product in products:
        prompt = product.get("image_prompt")
        if not prompt:
            continue
        path = await generate_product_image(prompt, product.get("slug", ""))
        if path:
            await db.products.update_one(
                {"_id": product["_id"]},
                {"$set": {"ai_image": path}},
            )
            logger.info(f"AI image generated for {product.get('slug')}: {path}")
        # small pause to be gentle
        await asyncio.sleep(0.5)
    logger.info("AI image generation batch complete")
