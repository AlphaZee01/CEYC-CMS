import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    text: "Found a pair of Manolo Blahniks for a fraction of the price. They were in pristine condition!",
    rating: 5,
  },
  {
    name: "Emily R.",
    text: "HeelVault has completely changed how I shop for heels. The curation is impeccable.",
    rating: 5,
  },
  {
    name: "Jessica L.",
    text: "Sustainable luxury shopping at its finest. My go-to for designer heels on a budget.",
    rating: 5,
  },
];

export default function TestimonialSection() {
  return (
    <section className="py-20 bg-beige">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl mb-2">What Our Clients Say</h2>
          <p className="text-sm text-muted-foreground font-body">Real reviews from real heel lovers</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-background p-8 rounded-sm shadow-soft text-center"
            >
              <div className="flex justify-center gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="text-sm font-body leading-relaxed text-muted-foreground mb-4 italic">
                "{t.text}"
              </p>
              <p className="text-xs font-body font-semibold tracking-widest uppercase">{t.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
