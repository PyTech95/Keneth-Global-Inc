import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ShoppingBag, User, Menu, X, ChevronDown, Search, Heart, Home as HomeIcon } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { TID } from "@/constants/testIds";
import { Monogram } from "@/components/Logo";
import SearchModal from "@/components/SearchModal";

export default function Header() {
    const { t, lang, setLang, languages } = useI18n();
    const { count } = useCart();
    const { count: wishCount } = useWishlist();
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const loc = useLocation();

    useEffect(() => { setOpen(false); }, [loc.pathname]);
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    // Keyboard shortcut "/" opens search
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "/" && !["INPUT","TEXTAREA"].includes(e.target.tagName)) {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const showBar = !loc.pathname.startsWith("/payment");
    const navItem = "text-[11px] tracking-[0.24em] uppercase text-bone-100/90 hover:text-brass-300 transition-colors";

    return (
        <>
            <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
            {showBar && (
                <div className="bg-ink-800 border-b border-white/5 overflow-hidden">
                    <div className="whitespace-nowrap py-2.5 flex animate-marquee">
                        {Array(2).fill(0).map((_, i) => (
                            <div key={i} className="flex shrink-0 items-center gap-8 sm:gap-14 pr-8 sm:pr-14">
                                <span className="text-[10px] sm:text-[11px] tracking-[0.24em] sm:tracking-[0.28em] uppercase text-bone-200">Complimentary EU delivery over €120</span>
                                <span className="text-brass-300 text-[10px]">◆</span>
                                <span className="text-[10px] sm:text-[11px] tracking-[0.24em] sm:tracking-[0.28em] uppercase text-bone-200">Sealed within hours of milling</span>
                                <span className="text-brass-300 text-[10px]">◆</span>
                                <span className="text-[10px] sm:text-[11px] tracking-[0.24em] sm:tracking-[0.28em] uppercase text-bone-200">Handcrafted in six Indian states</span>
                                <span className="text-brass-300 text-[10px]">◆</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <header className="sticky top-0 z-50 bg-ink-900/90 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        <Link to="/" data-testid={TID.logo} className="group flex items-center gap-3 sm:gap-4 shrink-0">
                            <Monogram className="w-14 h-14 sm:w-16 sm:h-16 group-hover:rotate-3 transition-transform duration-500 shrink-0" />
                            <div className="flex flex-col leading-none">
                                <div className="flex items-baseline gap-1.5 sm:gap-2">
                                    <span className="font-serif text-xl sm:text-[26px] tracking-tight text-white transition-colors">Keneth</span>
                                    <span className="font-serif italic text-base sm:text-[22px] text-white">Global Inc</span>
                                </div>
                                <span className="hidden sm:block text-[9px] tracking-[0.3em] uppercase text-bone-300 mt-1">Est. India · 2023</span>
                            </div>
                        </Link>

                        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
                            <NavLink to="/" data-testid={TID.navHome} className={`${navItem} flex items-center`} aria-label={t("nav.home")} title={t("nav.home")}>
                                <HomeIcon className="w-[18px] h-[18px]" strokeWidth={1.6} />
                            </NavLink>
                            <NavLink to="/shop/masalas" data-testid={TID.navMasalas} className={navItem}>{t("nav.masalas")}</NavLink>
                            <NavLink to="/shop/home-furnishing" data-testid={TID.navDecor} className={navItem}>{t("nav.decor")}</NavLink>
                            <NavLink to="/shop/artificial-jewelry" data-testid={TID.navJewelry} className={navItem}>{t("nav.jewelry")}</NavLink>
                            <NavLink to="/christmas" data-testid={TID.navChristmas} className={navItem}>{t("nav.christmas")}</NavLink>
                            <NavLink to="/shop" data-testid={TID.navShop} className={navItem}>{t("nav.shop")}</NavLink>
                        </nav>

                        <div className="flex items-center gap-3 sm:gap-5">
                            {/* Search */}
                            <button
                                onClick={() => setSearchOpen(true)}
                                data-testid="header-search-btn"
                                className="text-bone-100/80 hover:text-brass-400 transition-colors"
                                aria-label="Search"
                            >
                                <Search className="w-5 h-5" />
                            </button>

                            {/* Language */}
                            <div className="relative">
                                <button
                                    onClick={() => setLangOpen((s) => !s)}
                                    onBlur={() => setTimeout(() => setLangOpen(false), 200)}
                                    data-testid={TID.langBtn}
                                    className="flex items-center gap-1 text-[11px] tracking-[0.24em] uppercase text-bone-100/80 hover:text-brass-400 transition-colors"
                                >
                                    {languages.find((l) => l.code === lang)?.short || "EN"}
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                                {langOpen && (
                                    <div className="absolute right-0 top-full mt-3 min-w-[150px] bg-ink-800 border border-white/10 shadow-2xl">
                                        {languages.map((l) => (
                                            <button
                                                key={l.code}
                                                data-testid={TID.langOption(l.code)}
                                                onMouseDown={() => { setLang(l.code); setLangOpen(false); }}
                                                className={`block w-full text-left px-4 py-3 text-[11px] tracking-[0.18em] uppercase transition-colors ${
                                                    lang === l.code ? "text-brass-400" : "text-bone-100/80 hover:text-brass-400 hover:bg-ink-700"
                                                }`}
                                            >
                                                {l.short} · <span className="normal-case tracking-normal font-light">{l.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Wishlist */}
                            <Link
                                to="/wishlist"
                                data-testid="nav-wishlist"
                                className="relative hidden md:inline-flex text-bone-100/80 hover:text-brass-400 transition-colors"
                                aria-label="Wishlist"
                            >
                                <Heart className="w-5 h-5" />
                                {wishCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-brass-400 text-ink-900 text-[10px] font-medium min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full">
                                        {wishCount}
                                    </span>
                                )}
                            </Link>

                            {user ? (
                                <div className="hidden md:flex items-center gap-4">
                                    {user.role === "admin" && (
                                        <Link to="/admin" data-testid={TID.navAdmin} className={navItem}>{t("nav.admin")}</Link>
                                    )}
                                    <Link to="/account" data-testid={TID.navAccount} className="text-bone-100/80 hover:text-brass-400 transition-colors" aria-label={t("nav.account")}>
                                        <User className="w-5 h-5" />
                                    </Link>
                                </div>
                            ) : (
                                <Link to="/login" data-testid={TID.navLogin} className={`hidden md:inline ${navItem}`}>{t("nav.login")}</Link>
                            )}

                            <Link to="/cart" data-testid={TID.navCart} className="relative text-bone-100/80 hover:text-brass-400 transition-colors" aria-label={t("nav.cart")}>
                                <ShoppingBag className="w-5 h-5" />
                                {count > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-brass-400 text-ink-900 text-[10px] font-medium min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full">
                                        {count}
                                    </span>
                                )}
                            </Link>

                            <button onClick={() => setOpen(true)} className="lg:hidden text-bone-100 -mr-1" aria-label="Menu">
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {open && (
                    <div className="fixed inset-0 z-[60] bg-ink-900 flex flex-col overflow-y-auto">
                        <div className="flex items-center justify-between h-16 px-5 border-b border-white/10 shrink-0">
                            <div className="flex items-center gap-3">
                                <Monogram className="w-12 h-12" />
                                <span className="font-serif text-xl text-white">Keneth <span className="italic text-white">Global Inc</span></span>
                            </div>
                            <button onClick={() => setOpen(false)} className="text-bone-100 -mr-1" aria-label="Close">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <nav className="flex flex-col p-8 gap-1 flex-1">
                            <MobileLink to="/">{t("nav.home")}</MobileLink>
                            <MobileLink to="/shop/masalas">{t("nav.masalas")}</MobileLink>
                            <MobileLink to="/shop/home-furnishing">{t("nav.decor")}</MobileLink>
                            <MobileLink to="/shop/artificial-jewelry">{t("nav.jewelry")}</MobileLink>
                            <MobileLink to="/christmas">{t("nav.christmas")}</MobileLink>
                            <MobileLink to="/shop">{t("nav.shop")}</MobileLink>
                            <MobileLink to="/wholesale">Wholesale</MobileLink>
                            <MobileLink to="/certifications">Certifications</MobileLink>
                            <MobileLink to="/journal">Journal</MobileLink>
                            <MobileLink to="/wishlist">Wishlist {wishCount > 0 && <span className="text-brass-400">· {wishCount}</span>}</MobileLink>
                            <div className="h-px bg-white/10 my-6" />
                            {user ? (
                                <>
                                    <MobileLink to="/account" gold>{t("nav.account")}</MobileLink>
                                    {user.role === "admin" && <MobileLink to="/admin" gold>{t("nav.admin")}</MobileLink>}
                                    <button onClick={() => { logout(); setOpen(false); }} data-testid={TID.navLogout} className="text-left py-4 text-[11px] tracking-[0.28em] uppercase text-bone-300 hover:text-brass-400 transition-colors">
                                        {t("nav.logout")}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <MobileLink to="/login" gold>{t("nav.login")}</MobileLink>
                                    <MobileLink to="/register" gold>{t("nav.register")}</MobileLink>
                                </>
                            )}
                        </nav>
                        <div className="p-8 border-t border-white/10 text-xs text-bone-300/70 leading-relaxed">
                            <div className="font-serif text-sm text-bone-100 mb-1">Mr Sanjay Keneth Mal</div>
                            E-106, RG Luxury Homes, Sector-16B<br/>
                            Thana Bishrakh, Post I.A. Surajpur<br/>
                            Noida — 201306, Uttar Pradesh, India<br/>
                            <a href="mailto:keneth.sanjay@gmail.com" className="link-hairline mt-2 inline-block text-brass-400">keneth.sanjay@gmail.com</a><br/>
                            <span className="text-bone-300/60">+91 99538 39245</span>
                            <div className="mt-4 pt-4 border-t border-white/5 text-[9px] tracking-[0.24em] uppercase text-bone-300/50">
                                IEC · ADOPM2564J &nbsp; · &nbsp; GST · 09ADOPM2564J4ZY
                            </div>
                        </div>
                    </div>
                )}
            </header>
        </>
    );
}

function MobileLink({ to, children, gold = false }) {
    return (
        <Link
            to={to}
            className={`font-serif text-3xl leading-tight py-3 ${gold ? "text-brass-400" : "text-bone-100"} hover:text-brass-400 transition-colors`}
        >
            {children}
        </Link>
    );
}
