import { Heart, Eye, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const wishlisted = isInWishlist(product.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group"
    >
      <div className="relative overflow-hidden bg-secondary rounded-sm">
        <Link to={`/product/${product.id}`}>
          <div className="aspect-square overflow-hidden">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.condition === "Like New" && (
            <span className="bg-gold text-gold-foreground text-[10px] tracking-wider uppercase px-2 py-1 font-body font-medium">
              Like New
            </span>
          )}
          {product.originalPrice && (
            <span className="bg-primary text-primary-foreground text-[10px] tracking-wider uppercase px-2 py-1 font-body font-medium">
              -{Math.round((1 - product.price / product.originalPrice) * 100)}%
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={() => toggleWishlist(product.id)}
          className="absolute top-3 right-3 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
          aria-label="Toggle wishlist"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${wishlisted ? "fill-gold text-gold" : "text-foreground"}`}
          />
        </button>

        {/* Quick actions on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex gap-2">
          <button
            onClick={() => addToCart(product)}
            className="flex-1 bg-primary text-primary-foreground py-2.5 text-xs tracking-widest uppercase font-body font-medium hover:bg-gold hover:text-gold-foreground transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Add to Cart
          </button>
          <Link
            to={`/product/${product.id}`}
            className="bg-background text-foreground p-2.5 hover:bg-gold hover:text-gold-foreground transition-colors flex items-center justify-center"
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 space-y-1">
        <p className="text-[10px] tracking-widest uppercase text-muted-foreground font-body">{product.brand}</p>
        <Link to={`/product/${product.id}`}>
          <h3 className="text-sm font-body font-medium leading-tight hover:text-gold transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm font-body font-semibold">${product.price}</span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through font-body">
              ${product.originalPrice}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground font-body">
          Size {product.size} · {product.condition}
        </p>
      </div>
    </motion.div>
  );
}
