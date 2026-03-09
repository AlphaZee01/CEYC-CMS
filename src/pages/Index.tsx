import { motion } from "framer-motion";
import { products } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import HeroBanner from "@/components/HeroBanner";
import HeelTypesSection from "@/components/HeelTypesSection";
import TestimonialSection from "@/components/TestimonialSection";
import NewsletterSection from "@/components/NewsletterSection";

const Index = () => {
  const featured = products.filter((p) => p.isFeatured).slice(0, 4);
  const trending = products.filter((p) => p.isTrending).slice(0, 4);
  const newArrivals = products.filter((p) => p.isNewArrival).slice(0, 4);

  return (
    <div>
      <HeroBanner />

      {/* Featured */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl mb-2">Featured Heels</h2>
            <p className="text-sm text-muted-foreground font-body">Hand-picked for you</p>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="py-20 bg-beige">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl mb-2">Trending Now</h2>
            <p className="text-sm text-muted-foreground font-body">Most loved this week</p>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {trending.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl mb-2">New Arrivals</h2>
            <p className="text-sm text-muted-foreground font-body">Just landed in the vault</p>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {newArrivals.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      <HeelTypesSection />
      <TestimonialSection />

      {/* Style Tips */}
      <section className="py-20 bg-beige">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-4xl mb-2">Style Tips</h2>
            <p className="text-sm text-muted-foreground font-body mb-8">Discover how to wear your thrift finds</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {["How to Style Vintage Heels", "Caring for Pre-Loved Shoes", "Building a Capsule Heel Collection"].map(
                (title, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-background p-6 rounded-sm shadow-soft hover:shadow-card transition-shadow cursor-pointer group"
                  >
                    <h3 className="font-display text-base mb-2 group-hover:text-gold transition-colors">{title}</h3>
                    <p className="text-xs text-muted-foreground font-body">Read more →</p>
                  </motion.div>
                )
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <NewsletterSection />
    </div>
  );
};

export default Index;
