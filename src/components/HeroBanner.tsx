import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import heroBanner from "@/assets/hero-banner.jpg";

export default function HeroBanner() {
  return (
    <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroBanner}
          alt="Luxury thrift heels on marble"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/60 via-foreground/30 to-transparent" />
      </div>

      <div className="relative h-full container mx-auto px-4 lg:px-8 flex items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-lg"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gold text-xs tracking-[0.3em] uppercase font-body mb-4"
          >
            Curated Pre-Loved Luxury
          </motion.p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-background leading-[1.1] mb-6">
            Walk in<br />
            <span className="italic">Elegance</span>
          </h1>
          <p className="text-background/80 font-body text-sm md:text-base leading-relaxed mb-8 max-w-sm">
            Discover designer heels at a fraction of the price. Sustainable luxury, one step at a time.
          </p>
          <Link
            to="/shop"
            className="inline-block bg-gold text-gold-foreground px-8 py-4 text-xs tracking-[0.2em] uppercase font-body font-medium hover:bg-background hover:text-foreground transition-colors duration-300"
          >
            Shop Heels
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
