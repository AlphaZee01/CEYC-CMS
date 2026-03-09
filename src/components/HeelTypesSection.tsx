import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const types = [
  { name: "Stilettos", description: "Classic elegance" },
  { name: "Block Heels", description: "Comfort meets style" },
  { name: "Platforms", description: "Bold statement" },
  { name: "Wedges", description: "Effortless chic" },
];

export default function HeelTypesSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl mb-2">Shop by Type</h2>
          <p className="text-sm text-muted-foreground font-body">Find your perfect pair</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {types.map((type, i) => (
            <motion.div
              key={type.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={`/shop?type=${type.name.toLowerCase().replace(" ", "-")}`}
                className="block bg-secondary hover:bg-accent p-8 lg:p-12 text-center group transition-all duration-300 hover:shadow-card rounded-sm"
              >
                <h3 className="font-display text-lg lg:text-xl mb-1 group-hover:text-gold transition-colors">
                  {type.name}
                </h3>
                <p className="text-xs text-muted-foreground font-body">{type.description}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
