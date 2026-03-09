import { motion } from "framer-motion";

const posts = [
  {
    title: "5 Ways to Style Vintage Stilettos",
    excerpt: "Discover how to pair your thrift finds with modern outfits for a look that's both sustainable and stunning.",
    category: "Styling",
    date: "Mar 5, 2026",
  },
  {
    title: "How to Care for Pre-Loved Leather Heels",
    excerpt: "Keep your second-hand leather heels looking brand new with these simple maintenance tips.",
    category: "Shoe Care",
    date: "Feb 28, 2026",
  },
  {
    title: "The Rise of Sustainable Fashion",
    excerpt: "Why buying pre-loved designer heels is one of the best decisions for your wardrobe and the planet.",
    category: "Sustainability",
    date: "Feb 20, 2026",
  },
  {
    title: "Building Your Heel Capsule Collection",
    excerpt: "The five essential heel styles every woman should own — and how to find them secondhand.",
    category: "Styling",
    date: "Feb 14, 2026",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-beige py-12">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h1 className="font-display text-3xl md:text-4xl mb-2">The Vault Journal</h1>
          <p className="text-sm text-muted-foreground font-body">Style tips, care guides, and sustainable fashion stories</p>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {posts.map((post, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-secondary p-8 rounded-sm hover:shadow-card transition-shadow cursor-pointer group"
            >
              <span className="text-[10px] tracking-widest uppercase text-gold font-body font-medium">{post.category}</span>
              <h2 className="font-display text-xl mt-2 mb-3 group-hover:text-gold transition-colors">{post.title}</h2>
              <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">{post.excerpt}</p>
              <p className="text-xs text-muted-foreground font-body">{post.date}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
