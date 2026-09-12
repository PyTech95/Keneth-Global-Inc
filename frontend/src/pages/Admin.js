import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { formatPrice } from "@/lib/currency";
import { api, formatErr } from "@/lib/api";
import { TID } from "@/constants/testIds";
import { toast } from "sonner";
import { AdminVideoSettings } from "@/components/AdminVideoSettings";

const TABS = [
    { key: "stats", label: "Overview", tid: "admin-tab-stats" },
    { key: "products", label: "Products", tid: "admin-tab-products" },
    { key: "orders", label: "Orders", tid: "admin-tab-orders" },
    { key: "users", label: "Customers", tid: "admin-tab-users" },
    { key: "content", label: "Homepage", tid: "admin-tab-content" },
];

export default function Admin() {
    const { user, ready } = useAuth();
    const { t, lang } = useI18n();
    const [tab, setTab] = useState("stats");
    const [stats, setStats] = useState(null);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        if (!user || user.role !== "admin") return;
        api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
        api.get("/products?limit=200").then(({ data }) => setProducts(data)).catch(() => {});
        api.get("/admin/orders").then(({ data }) => setOrders(data)).catch(() => {});
        api.get("/admin/users").then(({ data }) => setUsers(data)).catch(() => {});
    }, [user]);

    if (!ready) return <div className="py-40 text-center text-bone-300">{t("common.loading")}</div>;
    if (!user || user.role !== "admin") return <Navigate to="/login" replace />;

    const regen = async (id) => {
        try {
            await api.post(`/admin/products/${id}/regenerate-image`);
            toast.success("Image queued — refresh in a moment");
        } catch (e) {
            toast.error(formatErr(e));
        }
    };

    return (
        <div className="pt-12 pb-24">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                <p className="text-[11px] tracking-[0.32em] uppercase text-brass-400 mb-4">— Atelier</p>
                <h1 className="font-serif text-5xl lg:text-6xl text-bone-100 tracking-tight leading-none mb-12">{t("admin.title")}</h1>

                {/* Tabs */}
                <div className="flex flex-wrap gap-x-8 gap-y-4 border-b border-white/10 mb-12">
                    {TABS.map((tb) => (
                        <button
                            key={tb.key}
                            data-testid={tb.tid || undefined}
                            onClick={() => setTab(tb.key)}
                            className={`pb-4 text-[11px] tracking-[0.28em] uppercase transition-colors border-b -mb-px ${
                                tab === tb.key ? "border-brass-400 text-brass-400" : "border-transparent text-bone-300 hover:text-bone-100"
                            }`}
                        >
                            {tb.label}
                        </button>
                    ))}
                </div>

                {tab === "content" && <AdminVideoSettings />}

                {tab === "stats" && stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { k: "revenue", label: t("admin.revenue"), value: formatPrice(stats.revenue_eur, lang) },
                            { k: "orders", label: t("admin.orders"), value: stats.orders },
                            { k: "products", label: t("admin.products"), value: stats.products },
                            { k: "users", label: t("admin.users"), value: stats.users },
                        ].map((c) => (
                            <div key={c.k} data-testid={TID.adminStat(c.k)} className="border border-white/10 p-8 hover:border-brass-400/40 transition-colors">
                                <div className="text-[10px] tracking-[0.28em] uppercase text-bone-300 mb-4">{c.label}</div>
                                <div className="font-serif text-4xl lg:text-5xl text-bone-100">{c.value}</div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === "products" && (
                    <div className="border border-white/10">
                        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-ink-800/40 text-[10px] tracking-[0.24em] uppercase text-bone-300">
                            <div className="col-span-5">Product</div>
                            <div className="col-span-2">Vertical</div>
                            <div className="col-span-2 text-right">Price</div>
                            <div className="col-span-3 text-right">Actions</div>
                        </div>
                        {products.map((p) => (
                            <div key={p.id} className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 items-center">
                                <div className="col-span-5 flex gap-3 items-center">
                                    <div className="w-12 h-12 bg-ink-800 overflow-hidden">
                                        {p.ai_image && <img src={`${process.env.REACT_APP_BACKEND_URL}/api/static/${p.ai_image}`} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <div>
                                        <div className="font-serif text-lg text-bone-100">{p.name.en}</div>
                                        <div className="text-xs text-bone-300/70">{p.slug}</div>
                                    </div>
                                </div>
                                <div className="col-span-2 text-xs tracking-[0.2em] uppercase text-bone-300">{p.vertical}</div>
                                <div className="col-span-2 text-right font-serif text-brass-400">{formatPrice(p.price_eur, lang)}</div>
                                <div className="col-span-3 text-right">
                                    <button onClick={() => regen(p.id)} className="text-[10px] tracking-[0.24em] uppercase text-brass-400 hover:text-brass-300 transition-colors">
                                        {p.ai_image ? "Re-generate image" : "Generate image"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === "orders" && (
                    <div className="border border-white/10">
                        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-ink-800/40 text-[10px] tracking-[0.24em] uppercase text-bone-300">
                            <div className="col-span-3">Order</div>
                            <div className="col-span-3">Customer</div>
                            <div className="col-span-2">Date</div>
                            <div className="col-span-2 text-right">Amount</div>
                            <div className="col-span-2 text-right">Status</div>
                        </div>
                        {orders.length === 0 && <div className="p-8 text-center text-bone-300">No orders yet.</div>}
                        {orders.map((o) => (
                            <div key={o.id} className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 items-center">
                                <div className="col-span-3 font-serif text-bone-100">#{o.id.slice(-10)}</div>
                                <div className="col-span-3 text-sm text-bone-300">{o.email || "guest"}</div>
                                <div className="col-span-2 text-sm text-bone-300">{new Date(o.created_at).toLocaleDateString()}</div>
                                <div className="col-span-2 text-right font-serif text-brass-400">{formatPrice(o.amount, lang)}</div>
                                <div className="col-span-2 text-right text-[10px] tracking-[0.2em] uppercase text-bone-100">{o.status}</div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === "users" && (
                    <div className="border border-white/10">
                        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-ink-800/40 text-[10px] tracking-[0.24em] uppercase text-bone-300">
                            <div className="col-span-4">Name</div>
                            <div className="col-span-5">Email</div>
                            <div className="col-span-2">Role</div>
                            <div className="col-span-1">Joined</div>
                        </div>
                        {users.map((u) => (
                            <div key={u.id} className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 items-center">
                                <div className="col-span-4 font-serif text-bone-100">{u.name}</div>
                                <div className="col-span-5 text-sm text-bone-300">{u.email}</div>
                                <div className="col-span-2 text-[10px] tracking-[0.2em] uppercase text-brass-400">{u.role}</div>
                                <div className="col-span-1 text-xs text-bone-300">{u.created_at && new Date(u.created_at).toLocaleDateString()}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
