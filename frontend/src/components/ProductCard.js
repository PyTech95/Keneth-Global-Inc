import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { productImage } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { TID } from "@/constants/testIds";
import { Plus, Heart } from "lucide-react";

export default function ProductCard({ product }) {
    const { tr, lang } = useI18n();
    const { add } = useCart();
    const { has, toggle } = useWishlist();
    const badge = product.badge ? (product.badge[lang] || product.badge.en) : null;
    const saved = has(product.slug);

    return (
        <div
            data-testid={TID.productCard(product.slug)}
            className="group flex flex-col"
        >
            <Link to={`/product/${product.slug}`} className="block relative card-image-wrap bg-ink-800 aspect-[4/5]">
                <img
                    src={productImage(product)}
                    alt={tr(product.name)}
                    loading="lazy"
                    className="w-full h-full object-cover"
                />
                {badge && (
                    <span className="absolute top-3 sm:top-4 left-3 sm:left-4 bg-ink-900/85 backdrop-blur border border-brass-400/40 text-brass-400 text-[9px] sm:text-[10px] tracking-[0.24em] uppercase px-2 sm:px-3 py-1 sm:py-1.5">
                        {badge}
                    </span>
                )}

                {/* Wishlist heart — always visible on mobile, hover on desktop */}
                <button
                    data-testid={`wishlist-${product.slug}`}
                    onClick={(e) => { e.preventDefault(); toggle(product.slug); }}
                    className={`absolute top-3 sm:top-4 right-3 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-all backdrop-blur border ${
                        saved
                            ? "bg-brass-400 text-ink-900 border-brass-400"
                            : "bg-ink-900/70 text-bone-100 border-white/15 sm:opacity-0 sm:group-hover:opacity-100 hover:border-brass-400 hover:text-brass-400"
                    }`}
                    aria-label="Toggle wishlist"
                >
                    <Heart className={`w-4 h-4 ${saved ? "fill-current" : ""}`} strokeWidth={1.5} />
                </button>

                <button
                    data-testid={TID.addToCart(product.slug)}
                    onClick={(e) => { e.preventDefault(); add(product, 1); }}
                    className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 bg-ink-900/90 backdrop-blur border border-white/15 hover:border-brass-400 hover:bg-brass-400 hover:text-ink-900 text-bone-100 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300"
                    aria-label="Add to cart"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </Link>
            <div className="pt-4 sm:pt-5 flex justify-between items-start gap-3 sm:gap-4">
                <div className="min-w-0">
                    <Link to={`/product/${product.slug}`} className="font-serif text-base sm:text-lg leading-tight text-bone-100 hover:text-brass-400 transition-colors block">
                        {tr(product.name)}
                    </Link>
                    <p className="text-[10px] sm:text-xs text-bone-300/70 mt-1 tracking-wide">
                        {product.unit}
                    </p>
                </div>
                <div className="font-serif text-base sm:text-lg text-brass-400 shrink-0">
                    {formatPrice(product.price_eur, lang)}
                </div>
            </div>
        </div>
    );
}
