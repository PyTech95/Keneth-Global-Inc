import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import ProductCard from "@/components/ProductCard";
import { TID } from "@/constants/testIds";

const VERTICAL_META = {
    masalas: { eyebrow: "— Indian Spices", titleKey: "vert.masalas.title" },
    "home-furnishing": { eyebrow: "— Home Furnishing", titleKey: "vert.decor.title" },
    "artificial-jewelry": { eyebrow: "— Artificial Jewelry", titleKey: "vert.jewelry.title" },
    "christmas-decor": { eyebrow: "— Christmas Decor", titleKey: "vert.christmas.title" },
};

export default function Shop() {
    const { vertical } = useParams();
    const nav = useNavigate();
    const { t } = useI18n();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const query = vertical ? `?vertical=${vertical}` : "";
        api.get(`/products${query}`).then(({ data }) => {
            setProducts(data);
            setLoading(false);
        }).catch(() => setLoading(false));
        window.scrollTo(0, 0);
    }, [vertical]);

    const meta = vertical ? VERTICAL_META[vertical] : null;
    const heading = meta ? t(meta.titleKey) : t("shop.title");
    const eyebrow = meta ? meta.eyebrow : "— The Collection";

    const tabCls = (active) => `text-[10px] sm:text-[11px] tracking-[0.24em] sm:tracking-[0.28em] uppercase pb-2 border-b transition-colors whitespace-nowrap ${
        active ? "border-brass-400 text-brass-400" : "border-transparent text-bone-300 hover:text-bone-100"
    }`;

    return (
        <div className="min-h-screen">
            <section className="pt-16 sm:pt-20 lg:pt-28 pb-12 sm:pb-16 border-b border-white/5">
                <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10">
                    <p className="text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-brass-400 mb-4 sm:mb-6">{eyebrow}</p>
                    <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl text-bone-100 tracking-tight leading-none mb-6 sm:mb-8">
                        {heading}
                    </h1>
                    {/* Filter tabs (horizontal scroll on mobile) */}
                    <div className="flex gap-5 sm:gap-8 mt-8 sm:mt-12 overflow-x-auto pb-1 -mx-5 px-5 sm:mx-0 sm:px-0 scrollbar-hide">
                        <button
                            data-testid={TID.filterAll}
                            onClick={() => nav("/shop")}
                            className={tabCls(!vertical)}
                        >
                            {t("shop.filter.all")}
                        </button>
                        <button
                            data-testid={TID.filterMasalas}
                            onClick={() => nav("/shop/masalas")}
                            className={tabCls(vertical === "masalas")}
                        >
                            {t("shop.filter.masalas")}
                        </button>
                        <button
                            data-testid={TID.filterDecor}
                            onClick={() => nav("/shop/home-furnishing")}
                            className={tabCls(vertical === "home-furnishing")}
                        >
                            {t("shop.filter.decor")}
                        </button>
                        <button
                            data-testid={TID.filterJewelry}
                            onClick={() => nav("/shop/artificial-jewelry")}
                            className={tabCls(vertical === "artificial-jewelry")}
                        >
                            {t("shop.filter.jewelry")}
                        </button>
                        <button
                            data-testid={TID.filterChristmas}
                            onClick={() => nav("/shop/christmas-decor")}
                            className={tabCls(vertical === "christmas-decor")}
                        >
                            {t("shop.filter.christmas")}
                        </button>
                    </div>
                </div>
            </section>

            <section className="py-12 sm:py-16 lg:py-24">
                <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10">
                    {loading ? (
                        <div className="text-center py-24 sm:py-32 text-bone-300 text-xs sm:text-sm tracking-[0.2em] uppercase">{t("common.loading")}</div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-24 sm:py-32 text-bone-300 text-xs sm:text-sm tracking-[0.2em] uppercase">{t("shop.empty")}</div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-10 sm:gap-y-14">
                            {products.map((p) => <ProductCard key={p.slug} product={p} />)}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
