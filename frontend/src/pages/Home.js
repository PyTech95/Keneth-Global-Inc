import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import ProductCard from "@/components/ProductCard";
import { TID } from "@/constants/testIds";
import { ArrowRight, Quote, Star } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=2000&q=85";
const MASALA_IMG = "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1400&q=85";
const DECOR_IMG = "https://images.pexels.com/photos/6480707/pexels-photo-6480707.jpeg?w=1400&q=85";
const JEWELRY_IMG = "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=1400&q=85";
const ABOUT_IMG = "https://images.unsplash.com/photo-1640292343595-889db1c8262e?w=1400&q=85";

// Category rows shown below "Featured this season" — rendered only if products exist.
const CATEGORY_SHOWCASE = [
    { v: "masalas", titleKey: "nav.masalas", to: "/shop/masalas" },
    { v: "artificial-jewelry", titleKey: "nav.jewelry", to: "/shop/artificial-jewelry" },
    { v: "home-furnishing", titleKey: "nav.decor", to: "/shop/home-furnishing" },
    { v: "christmas-decor", titleKey: "nav.christmas", to: "/christmas" },
];

const TESTIMONIALS = [
    { key: "home.testi.q1", name: "Camille Rousseau", location: "Lyon, France", rating: 5 },
    { key: "home.testi.q2", name: "Anders Holm", location: "Copenhagen, Denmark", rating: 5 },
    { key: "home.testi.q3", name: "Sofia Marchetti", location: "Milan, Italy", rating: 5 },
];

export default function Home() {
    const { t } = useI18n();
    const [products, setProducts] = useState([]);

    useEffect(() => {
        api.get("/products").then(({ data }) => setProducts(data)).catch(() => {});
    }, []);

    const byVertical = (v) => products.filter((p) => p.vertical === v);

    // Featured: a balanced shortlist across all three houses (spices included).
    const featured = [
        ...byVertical("masalas").slice(0, 2),
        ...byVertical("artificial-jewelry").slice(0, 2),
        ...byVertical("home-furnishing").slice(0, 2),
    ];

    return (
        <div>
            {/* HERO */}
            <section className="relative min-h-[560px] h-[85vh] w-full overflow-hidden">
                <div className="absolute inset-0 animate-ken-burns">
                    <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/75 to-ink-900/45" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink-900/85 via-ink-900/35 to-transparent" />
                <div className="relative z-10 h-full max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 flex flex-col justify-end pb-16 sm:pb-24 lg:pb-32">
                    <div className="max-w-3xl">
                        <p className="text-[11px] sm:text-xs tracking-[0.32em] sm:tracking-[0.4em] uppercase text-brass-200 mb-5 sm:mb-6 animate-fade-up on-image-shadow">
                            — {t("hero.eyebrow")}
                        </p>
                        <h1 className="font-serif text-[42px] sm:text-[68px] lg:text-[92px] leading-[0.95] tracking-tight text-white mb-6 sm:mb-8 animate-fade-up animate-fade-up-delay-1 hero-text-shadow">
                            {t("hero.title")}
                        </h1>
                        <p className="text-base sm:text-lg lg:text-xl text-bone-100 max-w-xl font-light leading-relaxed mb-10 sm:mb-12 animate-fade-up animate-fade-up-delay-2 on-image-shadow">
                            {t("hero.subtitle")}
                        </p>
                        <div className="flex flex-wrap gap-4 sm:gap-6 animate-fade-up animate-fade-up-delay-3">
                            <Link
                                to="/shop"
                                data-testid={TID.heroCta}
                                className="group inline-flex items-center gap-3 sm:gap-4 border border-brass-400 text-brass-400 hover:bg-brass-400 hover:text-ink-900 transition-colors duration-500 px-6 sm:px-8 py-3.5 sm:py-4 text-[10px] sm:text-[11px] tracking-[0.24em] sm:tracking-[0.28em] uppercase"
                            >
                                {t("hero.cta")}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/about"
                                data-testid={TID.heroCta2}
                                className="text-bone-100 hover:text-brass-400 transition-colors px-4 sm:px-8 py-3.5 sm:py-4 text-[10px] sm:text-[11px] tracking-[0.24em] sm:tracking-[0.28em] uppercase link-hairline"
                            >
                                {t("hero.cta2")}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ABOUT US */}
            <section data-testid={TID.aboutSection} className="py-20 sm:py-24 lg:py-32 border-t border-white/5">
                <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                        <div className="lg:col-span-6 order-2 lg:order-1">
                            <p className="text-[11px] sm:text-xs tracking-[0.32em] uppercase text-brass-300 mb-5">— {t("home.about.eyebrow")}</p>
                            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-bone-100 tracking-tight leading-[1.02] mb-6 sm:mb-8">
                                {t("home.about.title")}
                            </h2>
                            <p className="text-base sm:text-lg text-bone-200 font-light leading-relaxed mb-5">
                                {t("home.about.p1")}
                            </p>
                            <p className="text-base sm:text-lg text-bone-300 font-light leading-relaxed mb-8 sm:mb-10">
                                {t("home.about.p2")}
                            </p>
                            <div className="flex flex-wrap items-center gap-8 sm:gap-12 mb-10">
                                <Stat value="17+" label={t("home.about.stat.products")} />
                                <Stat value="3" label={t("home.about.stat.houses")} />
                                <Stat value="2023" label={t("home.about.stat.est")} />
                            </div>
                            <Link
                                to="/about"
                                data-testid={TID.aboutCta}
                                className="group inline-flex items-center gap-3 border border-brass-400 text-brass-400 hover:bg-brass-400 hover:text-ink-900 transition-colors duration-500 px-7 py-3.5 text-[10px] sm:text-[11px] tracking-[0.28em] uppercase"
                            >
                                {t("home.about.cta")}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        <div className="lg:col-span-6 order-1 lg:order-2">
                            <div className="relative card-image-wrap aspect-[4/3] bg-ink-800">
                                <img src={ABOUT_IMG} alt="Indian artisan at work" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/40 to-transparent" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* THREE HOUSES / VERTICALS */}
            <section className="py-20 sm:py-24 lg:py-32 border-t border-white/5">
                <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-16 mb-12 sm:mb-16">
                        <div className="lg:col-span-4">
                            <p className="text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-brass-300 mb-4">— 01 · Provenance</p>
                        </div>
                        <div className="lg:col-span-8">
                            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-bone-100 tracking-tight leading-none mb-5 sm:mb-6">
                                {t("sec.verticals.title")}
                            </h2>
                            <p className="text-base sm:text-lg text-bone-300 font-light max-w-2xl leading-relaxed">
                                {t("sec.verticals.sub")}
                            </p>
                        </div>
                    </div>

                    {/* Editorial 3-column vertical showcase */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
                        <VerticalCard
                            testId={TID.verticalMasalas}
                            to="/shop/masalas"
                            eyebrow={`— ${t("home.house.masalas")}`}
                            title={t("vert.masalas.title")}
                            desc={t("vert.masalas.desc")}
                            img={MASALA_IMG}
                        />
                        <VerticalCard
                            testId={TID.verticalDecor}
                            to="/shop/home-furnishing"
                            eyebrow={`— ${t("home.house.home-furnishing")}`}
                            title={t("vert.decor.title")}
                            desc={t("vert.decor.desc")}
                            img={DECOR_IMG}
                        />
                        <VerticalCard
                            testId={TID.verticalJewelry}
                            to="/shop/artificial-jewelry"
                            eyebrow={`— ${t("home.house.artificial-jewelry")}`}
                            title={t("vert.jewelry.title")}
                            desc={t("vert.jewelry.desc")}
                            img={JEWELRY_IMG}
                        />
                    </div>
                </div>
            </section>

            {/* FEATURED PRODUCTS */}
            <section className="py-20 sm:py-24 lg:py-32 border-t border-white/5">
                <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 sm:mb-16 gap-4 sm:gap-6">
                        <div>
                            <p className="text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-brass-300 mb-3 sm:mb-4">— 02 · Curated</p>
                            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-bone-100 tracking-tight leading-none">
                                {t("sec.featured.title")}
                            </h2>
                            <p className="text-base sm:text-lg text-bone-300 font-light mt-4 max-w-xl">{t("sec.featured.sub")}</p>
                        </div>
                        <Link to="/shop" className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-brass-300 link-hairline self-start md:self-auto">
                            {t("home.viewAll")}
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-10 sm:gap-y-14">
                        {featured.slice(0, 6).map((p) => <ProductCard key={p.slug} product={p} />)}
                    </div>
                </div>
            </section>

            {/* CATEGORY SHOWCASES — Indian Spices · Artificial Jewelry · Home Decor · Christmas Decor */}
            {CATEGORY_SHOWCASE.map((cat, idx) => {
                const catItems = byVertical(cat.v);
                if (catItems.length === 0) return null;
                return (
                    <section
                        key={cat.v}
                        data-testid={TID.categorySection(cat.v)}
                        className="py-16 sm:py-20 lg:py-28 border-t border-white/5"
                    >
                        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10">
                            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 sm:mb-14 gap-4">
                                <div>
                                    <p className="text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-brass-300 mb-3 sm:mb-4">
                                        — {String(idx + 3).padStart(2, "0")} · {t(`home.house.${cat.v}`)}
                                    </p>
                                    <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-bone-100 tracking-tight leading-none">
                                        {t(cat.titleKey)}
                                    </h2>
                                </div>
                                <Link
                                    to={cat.to}
                                    className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-brass-300 link-hairline self-start md:self-auto"
                                >
                                    {t("home.shopAll")}
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-10 sm:gap-y-14">
                                {catItems.slice(0, 4).map((p) => <ProductCard key={p.slug} product={p} />)}
                            </div>
                        </div>
                    </section>
                );
            })}

            {/* TESTIMONIALS */}
            <section data-testid={TID.testimonialsSection} className="py-20 sm:py-24 lg:py-32 border-t border-white/5 bg-ink-800/30">
                <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10">
                    <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
                        <p className="text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-brass-300 mb-4">— {t("home.testi.eyebrow")}</p>
                        <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-bone-100 tracking-tight leading-none">
                            {t("home.testi.title")}
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        {TESTIMONIALS.map((tm, i) => (
                            <figure
                                key={i}
                                data-testid={`testimonial-${i}`}
                                className="border border-white/10 bg-ink-900/40 p-8 sm:p-10 flex flex-col"
                            >
                                <Quote className="w-7 h-7 text-brass-400 mb-6" strokeWidth={1.4} />
                                <div className="flex gap-1 mb-5">
                                    {Array(tm.rating).fill(0).map((_, s) => (
                                        <Star key={s} className="w-4 h-4 text-brass-400 fill-current" />
                                    ))}
                                </div>
                                <blockquote className="font-serif italic text-xl sm:text-2xl leading-snug text-bone-100 mb-8 flex-1">
                                    “{t(tm.key)}”
                                </blockquote>
                                <figcaption>
                                    <div className="text-sm tracking-wide text-bone-100">{tm.name}</div>
                                    <div className="text-[11px] tracking-[0.18em] uppercase text-bone-300 mt-1">{tm.location}</div>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRESS BAR */}
            <section className="py-12 sm:py-16 border-t border-b border-white/5 bg-ink-800/40">
                <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10">
                    <p className="text-[9px] sm:text-[10px] tracking-[0.4em] uppercase text-bone-300 text-center mb-6 sm:mb-8">{t("sec.press.title")}</p>
                    <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 lg:gap-20 opacity-80">
                        <span className="font-serif italic text-lg sm:text-2xl text-bone-100">Kinfolk</span>
                        <span className="font-serif text-lg sm:text-2xl tracking-widest text-bone-100">MONOCLE</span>
                        <span className="font-serif italic text-lg sm:text-2xl text-bone-100">Vogue Living</span>
                        <span className="font-serif text-base sm:text-xl tracking-[0.3em] text-bone-100">CEREAL</span>
                        <span className="font-serif italic text-lg sm:text-2xl text-bone-100">Elle Décor</span>
                    </div>
                </div>
            </section>

            {/* NEWSLETTER */}
            <section className="py-20 sm:py-24 lg:py-32">
                <div className="max-w-3xl mx-auto px-5 sm:px-6 text-center">
                    <p className="text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-brass-300 mb-4">— The Dispatch</p>
                    <h2 className="font-serif text-4xl sm:text-5xl text-bone-100 tracking-tight leading-none mb-4">
                        {t("sec.newsletter.title")}
                    </h2>
                    <p className="text-sm sm:text-base text-bone-300 font-light leading-relaxed mb-8 sm:mb-10">{t("sec.newsletter.sub")}</p>
                    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-xl mx-auto">
                        <input
                            type="email"
                            placeholder={t("sec.newsletter.placeholder")}
                            className="flex-1 bg-transparent border-b border-white/20 rounded-none text-bone-100 px-2 py-3 focus:outline-none focus:border-brass-400 transition-colors placeholder:text-bone-300/70"
                        />
                        <button
                            type="submit"
                            className="border border-brass-400 text-brass-400 hover:bg-brass-400 hover:text-ink-900 transition-colors duration-500 px-6 sm:px-8 py-3 text-[10px] sm:text-[11px] tracking-[0.24em] sm:tracking-[0.28em] uppercase"
                        >
                            {t("sec.newsletter.submit")}
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
}

function Stat({ value, label }) {
    return (
        <div>
            <div className="font-serif text-3xl sm:text-4xl text-brass-400 leading-none">{value}</div>
            <div className="text-[10px] sm:text-[11px] tracking-[0.24em] uppercase text-bone-300 mt-2">{label}</div>
        </div>
    );
}

function VerticalCard({ testId, to, eyebrow, title, desc, img }) {
    return (
        <Link
            to={to}
            data-testid={testId}
            className="group relative aspect-[4/5] card-image-wrap bg-ink-800 block"
        >
            <img src={img} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/70 to-ink-900/10" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10">
                <p className="text-[11px] sm:text-xs tracking-[0.28em] sm:tracking-[0.32em] uppercase text-brass-200 mb-2 sm:mb-3 on-image-shadow">{eyebrow}</p>
                <h3 className="font-serif text-3xl sm:text-4xl text-white mb-2 sm:mb-3 leading-none hero-text-shadow">
                    {title}
                </h3>
                <p className="text-sm text-bone-100 font-light max-w-md mb-4 sm:mb-5 leading-relaxed on-image-shadow">{desc}</p>
                <span className="inline-flex items-center gap-2 sm:gap-3 text-[11px] tracking-[0.24em] sm:tracking-[0.28em] uppercase text-brass-200 group-hover:gap-4 sm:group-hover:gap-5 transition-all">
                    Discover <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
            </div>
        </Link>
    );
}
