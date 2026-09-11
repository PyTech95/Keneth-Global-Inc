"""Backend API tests for Keneth Global e-commerce (Noida Marketplace v1)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN_EMAIL = "admin@kenethglobal.com"
ADMIN_PASS = "Admin@Keneth2026"


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def customer_token(api):
    email = f"TEST_cust_{int(time.time()*1000)}@example.com"
    r = api.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "Password123!", "name": "TEST Customer"
    })
    assert r.status_code == 200, r.text
    return r.json()["token"], email


# ---------------- Health ----------------
class TestHealth:
    def test_health(self, api):
        r = api.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        d = r.json()
        assert d["db"] is True
        assert d["status"] == "ok"


# ---------------- Products ----------------
class TestProducts:
    def test_list_products(self, api):
        r = api.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 17, f"expected >=17, got {len(data)}"
        # All must have ai_image
        for p in data:
            assert p.get("ai_image"), f"product {p.get('slug')} missing ai_image"
            assert "slug" in p and "price_eur" in p and "vertical" in p

    def test_verticals(self, api):
        r = api.get(f"{BASE_URL}/api/products/verticals")
        assert r.status_code == 200
        tree = r.json()
        assert {"masalas", "home-furnishing", "artificial-jewelry"}.issubset(set(tree.keys())), tree.keys()
        assert tree["masalas"]["total"] == 6
        assert tree["home-furnishing"]["total"] == 6
        assert tree["artificial-jewelry"]["total"] == 5
        # categories sum to the vertical total
        for v, node in tree.items():
            assert sum(node["categories"].values()) == node["total"]

    def test_get_product_by_slug(self, api):
        r = api.get(f"{BASE_URL}/api/products/royal-garam-masala")
        assert r.status_code == 200
        p = r.json()
        assert p["slug"] == "royal-garam-masala"
        assert float(p["price_eur"]) == 8.90

    def test_filter_by_vertical(self, api):
        for v, n in [("masalas", 6), ("home-furnishing", 6), ("artificial-jewelry", 5)]:
            r = api.get(f"{BASE_URL}/api/products", params={"vertical": v})
            assert r.status_code == 200
            data = r.json()
            assert len(data) == n, f"vertical {v}: expected {n}, got {len(data)}"
            assert all(p["vertical"] == v for p in data)

    def test_get_nonexistent(self, api):
        r = api.get(f"{BASE_URL}/api/products/does-not-exist")
        assert r.status_code == 404

    def test_filter_by_category(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"category": "blended-spices"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
        assert all(p["category"] == "blended-spices" for p in data)

    def test_search_query(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"q": "masala"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 3
        assert all("masala" in (p["slug"] + str(p["name"]).lower()) for p in data)

    def test_no_mongo_object_id_leak(self, api):
        r = api.get(f"{BASE_URL}/api/products")
        for p in r.json():
            assert "_id" not in p
            assert isinstance(p["id"], str)

    def test_limit_param(self, api):
        r = api.get(f"{BASE_URL}/api/products", params={"limit": 5})
        assert r.status_code == 200
        assert len(r.json()) == 5


# ---------------- Static Images ----------------
class TestStaticImages:
    def test_static_image_serves(self, api):
        # Pick first product's ai_image path
        r = api.get(f"{BASE_URL}/api/products")
        products = r.json()
        img_path = products[0]["ai_image"]
        # ai_image stored as relative path; frontend prepends /api/static/
        if not img_path.startswith("/"):
            url = f"{BASE_URL}/api/static/{img_path}"
        else:
            url = f"{BASE_URL}{img_path}"
        img_r = requests.get(url)
        assert img_r.status_code == 200
        assert "image/png" in img_r.headers.get("content-type", "").lower()


# ---------------- Auth ----------------
class TestAuth:
    def test_admin_login(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and d["user"]["role"] == "admin"

    def test_login_wrong_password(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_register_and_me(self, api):
        email = f"TEST_user_{int(time.time()*1000)}@example.com"
        r = api.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "Password123!", "name": "TEST User"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"].lower() == email.lower()
        assert d["user"]["role"] == "customer"
        token = d["token"]
        me = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"].lower() == email.lower()

    def test_register_duplicate(self, api):
        email = f"TEST_dup_{int(time.time()*1000)}@example.com"
        p = {"email": email, "password": "Password123!", "name": "Dup"}
        api.post(f"{BASE_URL}/api/auth/register", json=p)
        r = api.post(f"{BASE_URL}/api/auth/register", json=p)
        assert r.status_code == 400

    def test_me_no_token(self, api):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code in (401, 403)


# ---------------- Checkout ----------------
class TestCheckout:
    def test_create_checkout_session(self, api):
        payload = {
            "items": [{"slug": "royal-garam-masala", "quantity": 2}],
            "origin_url": BASE_URL,
            "email": "guest@test.com",
        }
        r = api.post(f"{BASE_URL}/api/checkout/session", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "checkout_url" in d and "session_id" in d
        assert "stripe.com" in d["checkout_url"]
        s = api.get(f"{BASE_URL}/api/checkout/status/{d['session_id']}")
        assert s.status_code == 200
        sd = s.json()
        assert sd["status"] in ("initiated", "completed")
        assert sd["amount"] == 17.80

    def test_checkout_empty(self, api):
        r = api.post(f"{BASE_URL}/api/checkout/session", json={"items": [], "origin_url": BASE_URL})
        assert r.status_code == 400

    def test_checkout_bad_product(self, api):
        r = api.post(f"{BASE_URL}/api/checkout/session", json={
            "items": [{"slug": "nonexistent-xyz", "quantity": 1}],
            "origin_url": BASE_URL,
        })
        assert r.status_code == 400

    def test_status_not_found(self, api):
        r = api.get(f"{BASE_URL}/api/checkout/status/nonexistent-session")
        assert r.status_code == 404

    def test_server_computes_amount_ignores_client_price(self, api):
        """Client-supplied price/amount fields must be ignored; total comes from DB."""
        payload = {
            "items": [{"slug": "kashmiri-red-chilli", "quantity": 3, "unit_price": 0.01, "price_eur": 0.01}],
            "origin_url": BASE_URL,
            "amount": 0.01,
            "email": "guest@test.com",
        }
        r = api.post(f"{BASE_URL}/api/checkout/session", json=payload)
        assert r.status_code == 200, r.text
        sid = r.json()["session_id"]
        s = api.get(f"{BASE_URL}/api/checkout/status/{sid}").json()
        assert s["amount"] == 19.50, s  # 6.50 * 3
        assert s["currency"] == "eur"
        assert s["payment_status"] == "pending"

    def test_invalid_quantity_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/checkout/session", json={
            "items": [{"slug": "royal-garam-masala", "quantity": 0}], "origin_url": BASE_URL})
        assert r.status_code == 422, r.text

    def test_authenticated_checkout_creates_order_for_user(self, api, customer_token):
        """E2E: authed checkout -> order written -> visible in /api/orders/mine."""
        token, email = customer_token
        h = {"Authorization": f"Bearer {token}"}
        r = api.post(f"{BASE_URL}/api/checkout/session", json={
            "items": [{"slug": "turmeric-gold", "quantity": 2},
                      {"slug": "chai-masala", "quantity": 1}],
            "origin_url": BASE_URL,
        }, headers=h)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["checkout_url"].startswith("https://")
        sid = d["session_id"]

        mine = api.get(f"{BASE_URL}/api/orders/mine", headers=h)
        assert mine.status_code == 200
        orders = mine.json()
        match = [o for o in orders if o["session_id"] == sid]
        assert match, f"order {sid} not found in /orders/mine"
        o = match[0]
        assert "_id" not in o
        assert o["status"] == "initiated"
        assert o["payment_status"] == "pending"
        assert o["amount"] == round(7.20 * 2 + 5.90, 2)
        assert o["email"].lower() == email.lower()
        assert len(o["items"]) == 2
        assert {i["slug"] for i in o["items"]} == {"turmeric-gold", "chai-masala"}

        # GET /api/orders/{id} accessible by owner
        one = api.get(f"{BASE_URL}/api/orders/{o['id']}", headers=h)
        assert one.status_code == 200
        assert one.json()["session_id"] == sid

    def test_order_not_visible_to_other_user(self, api, customer_token):
        token, _ = customer_token
        h = {"Authorization": f"Bearer {token}"}
        r = api.post(f"{BASE_URL}/api/checkout/session", json={
            "items": [{"slug": "biryani-masala", "quantity": 1}], "origin_url": BASE_URL}, headers=h)
        assert r.status_code == 200
        sid = r.json()["session_id"]
        order_id = [o for o in api.get(f"{BASE_URL}/api/orders/mine", headers=h).json()
                    if o["session_id"] == sid][0]["id"]

        # second customer
        other_email = f"TEST_other_{int(time.time()*1000)}@example.com"
        r2 = api.post(f"{BASE_URL}/api/auth/register", json={
            "email": other_email, "password": "Password123!", "name": "TEST Other"})
        assert r2.status_code == 200
        h2 = {"Authorization": f"Bearer {r2.json()['token']}"}
        assert api.get(f"{BASE_URL}/api/orders/{order_id}", headers=h2).status_code == 403
        assert all(o["session_id"] != sid for o in api.get(f"{BASE_URL}/api/orders/mine", headers=h2).json())

    def test_order_detail_requires_auth(self, api):
        r = requests.get(f"{BASE_URL}/api/orders/000000000000000000000000")
        assert r.status_code in (401, 403)


# ---------------- Admin ----------------
class TestAdmin:
    def test_stats(self, api, admin_headers):
        r = api.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("products", "orders", "users", "revenue_eur"):
            assert k in d
        assert d["products"] >= 17

    def test_orders(self, api, admin_headers):
        r = api.get(f"{BASE_URL}/api/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_users(self, api, admin_headers):
        r = api.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_requires_admin(self, api, customer_token):
        token, _ = customer_token
        r = api.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 403

    def test_admin_no_auth(self, api):
        r = requests.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code in (401, 403)

    def test_admin_orders_forbidden_for_customer(self, api, customer_token):
        token, _ = customer_token
        h = {"Authorization": f"Bearer {token}"}
        assert api.get(f"{BASE_URL}/api/admin/orders", headers=h).status_code == 403
        assert api.get(f"{BASE_URL}/api/admin/users", headers=h).status_code == 403

    def test_admin_invalid_token(self, api):
        r = api.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": "Bearer not.a.jwt"})
        assert r.status_code == 401

    def test_admin_users_no_password_hash_leak(self, api, admin_headers):
        r = api.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert r.status_code == 200
        for u in r.json():
            assert "password_hash" not in u
            assert "_id" not in u

    def test_admin_patch_product_price_and_revert(self, api, admin_headers):
        p = api.get(f"{BASE_URL}/api/products/oxidised-silver-ring-stack").json()
        original = p["price_eur"]
        r = api.patch(f"{BASE_URL}/api/admin/products/{p['id']}",
                      json={"price_eur": 99.99}, headers=admin_headers)
        assert r.status_code == 200, r.text
        assert r.json()["price_eur"] == 99.99
        # verify persisted
        assert api.get(f"{BASE_URL}/api/products/oxidised-silver-ring-stack").json()["price_eur"] == 99.99
        # revert
        rv = api.patch(f"{BASE_URL}/api/admin/products/{p['id']}",
                       json={"price_eur": original}, headers=admin_headers)
        assert rv.status_code == 200
        assert api.get(f"{BASE_URL}/api/products/oxidised-silver-ring-stack").json()["price_eur"] == original

    def test_admin_patch_invalid_id(self, api, admin_headers):
        r = api.patch(f"{BASE_URL}/api/admin/products/notanobjectid",
                      json={"price_eur": 10.0}, headers=admin_headers)
        assert r.status_code == 400


# ---------------- Orders ----------------
class TestOrders:
    def test_mine_requires_auth(self, api):
        r = requests.get(f"{BASE_URL}/api/orders/mine")
        assert r.status_code in (401, 403)

    def test_mine_empty(self, api, customer_token):
        token, _ = customer_token
        r = api.get(f"{BASE_URL}/api/orders/mine", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------- Wishlist ----------------
class TestWishlist:
    def test_wishlist_crud(self, api, customer_token):
        token, _ = customer_token
        h = {"Authorization": f"Bearer {token}"}
        # list empty
        r = api.get(f"{BASE_URL}/api/wishlist", headers=h)
        assert r.status_code == 200
        assert r.json() == []
        # add
        r = api.post(f"{BASE_URL}/api/wishlist", json={"slug": "royal-garam-masala"}, headers=h)
        assert r.status_code == 200
        # list contains
        r = api.get(f"{BASE_URL}/api/wishlist", headers=h)
        assert r.status_code == 200
        data = r.json()
        assert any(p["slug"] == "royal-garam-masala" for p in data)
        # remove
        r = api.delete(f"{BASE_URL}/api/wishlist/royal-garam-masala", headers=h)
        assert r.status_code == 200
        r = api.get(f"{BASE_URL}/api/wishlist", headers=h)
        assert all(p["slug"] != "royal-garam-masala" for p in r.json())

    def test_wishlist_requires_auth(self, api):
        r = requests.get(f"{BASE_URL}/api/wishlist")
        assert r.status_code in (401, 403)


# ---------------- Journal ----------------
class TestJournal:
    def test_list_journal(self, api):
        r = api.get(f"{BASE_URL}/api/journal")
        assert r.status_code == 200
        posts = r.json()
        assert len(posts) == 3, f"expected 3 posts got {len(posts)}"
        for p in posts:
            assert p.get("cover_image"), f"post {p.get('slug')} missing cover_image"

    def test_get_journal_post(self, api):
        r = api.get(f"{BASE_URL}/api/journal/forty-five-days-of-fire")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == "forty-five-days-of-fire"
        assert "body" in d


# ---------------- Wholesale ----------------
class TestWholesale:
    def test_submit_enquiry(self, api):
        payload = {
            "company": "TEST Import Co",
            "contact_name": "TEST Buyer",
            "email": "buyer@test.com",
            "country": "Germany",
            "interest": "spices",
            "volume": "100-500kg",
            "message": "TEST enquiry",
        }
        r = api.post(f"{BASE_URL}/api/wholesale/enquiry", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "received"
        assert "id" in d
