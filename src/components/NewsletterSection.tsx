import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success("Thank you for subscribing!");
      setEmail("");
    }
  };

  return (
    <section className="bg-primary text-primary-foreground py-20">
      <div className="container mx-auto px-4 lg:px-8 text-center max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-3xl md:text-4xl mb-3">Stay in the Loop</h2>
          <p className="text-sm opacity-70 font-body mb-8">
            Get first access to new arrivals, exclusive deals, and style tips.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-0">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="flex-1 bg-primary-foreground/10 border border-primary-foreground/20 px-4 py-3 text-sm font-body text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold"
              required
            />
            <button
              type="submit"
              className="bg-gold text-gold-foreground px-6 py-3 text-xs tracking-widest uppercase font-body font-medium hover:bg-gold-light hover:text-foreground transition-colors"
            >
              Subscribe
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
