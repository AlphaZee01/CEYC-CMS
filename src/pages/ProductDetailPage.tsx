import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Heart, ShoppingBag, ChevronLeft } from "lucide-react";
import { products } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import ProductCard from "@/components/ProductCard";

export default function ProductDetailPage() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl mb-4">Product not found</h1>
          <Link to="/shop" className="text-sm font-body underline hover:text-gold">Back to shop</Link>
        </div>
      </div>
    );
  }

  const wishlisted = isInWishlist(product.id);
  const related = products.filter((p) => p.id !== product.id && p.heelType === product.heelType).slice(0, 4);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 lg:px-8 py-6">
        <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ChevronLeft className="w-4 h-4" /> Back to Shop
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="aspect-square bg-secondary rounded-sm overflow-hidden">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col justify-center"
          >
            <p className="text-xs tracking-widest uppercase text-muted-foreground font-body mb-2">{product.brand}</p>
            <h1 className="font-display text-2xl md:text-3xl mb-4">{product.name}</h1>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-gold text-gold" : "text-border"}`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-body">({product.reviewCount} reviews)</span>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-2xl font-body font-bold">${product.price}</span>
              {product.originalPrice && (
                <span className="text-base text-muted-foreground line-through font-body">${product.originalPrice}</span>
              )}
              {product.originalPrice && (
                <span className="text-xs bg-gold-light text-gold px-2 py-1 rounded-sm font-body font-medium">
                  Save {Math.round((1 - product.price / product.originalPrice) * 100)}%
                </span>
              )}
            </div>

            <div className="space-y-3 mb-8 text-sm font-body">
              <div className="flex gap-8">
                <div><span className="text-muted-foreground">Size:</span> <span className="font-medium">{product.size}</span></div>
                <div><span className="text-muted-foreground">Color:</span> <span className="font-medium">{product.color}</span></div>
              </div>
              <div className="flex gap-8">
                <div><span className="text-muted-foreground">Heel Type:</span> <span className="font-medium">{product.heelType}</span></div>
                <div><span className="text-muted-foreground">Condition:</span> <span className="font-medium">{product.condition}</span></div>
              </div>
            </div>

            <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8">{product.description}</p>

            <div className={`text-xs font-body font-medium mb-6 ${product.inStock ? "text-green-600" : "text-destructive"}`}>
              {product.inStock ? "● In Stock" : "● Out of Stock"}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => addToCart(product)}
                className="flex-1 bg-primary text-primary-foreground py-4 text-xs tracking-widest uppercase font-body font-medium hover:bg-gold hover:text-gold-foreground transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                Add to Cart
              </button>
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`px-5 py-4 border rounded-sm transition-colors ${
                  wishlisted ? "bg-gold border-gold text-gold-foreground" : "border-border hover:border-gold"
                }`}
              >
                <Heart className={`w-5 h-5 ${wishlisted ? "fill-current" : ""}`} />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Reviews */}
        <section className="py-16 border-t border-border mt-16">
          <h2 className="font-display text-2xl mb-8">Customer Reviews</h2>
          <div className="space-y-6 max-w-2xl">
            {[
              { name: "Anna K.", rating: 5, text: "Absolutely gorgeous! Even better than expected. Fast shipping too." },
              { name: "Maria S.", rating: 4, text: "Beautiful heels, true to size. Minor scuff on the sole but mentioned in description." },
              { name: "Claire D.", rating: 5, text: "Can't believe this was pre-loved. Looks brand new. Will shop again!" },
            ].map((review, i) => (
              <div key={i} className="border-b border-border pb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star key={j} className="w-3 h-3 fill-gold text-gold" />
                    ))}
                  </div>
                  <span className="text-xs font-body font-semibold">{review.name}</span>
                </div>
                <p className="text-sm font-body text-muted-foreground">{review.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="py-16 border-t border-border">
            <h2 className="font-display text-2xl mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
