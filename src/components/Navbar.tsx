import { Link } from "react-router-dom";
import { ShoppingBag, Heart, Search, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { totalItems, setIsCartOpen } = useCart();
  const { wishlist } = useWishlist();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Mobile menu */}
          <button
            className="lg:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo */}
          <Link to="/" className="font-display text-xl lg:text-2xl font-semibold tracking-wide">
            HEEL<span className="text-gold">VAULT</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-8 font-body text-sm tracking-widest uppercase">
            <Link to="/" className="hover:text-gold transition-colors duration-300">Home</Link>
            <Link to="/shop" className="hover:text-gold transition-colors duration-300">Shop</Link>
            <Link to="/shop?filter=new" className="hover:text-gold transition-colors duration-300">New Arrivals</Link>
            <Link to="/blog" className="hover:text-gold transition-colors duration-300">Blog</Link>
          </div>

          {/* Icons */}
          <div className="flex items-center gap-3">
            <Link to="/shop" className="p-2 hover:text-gold transition-colors">
              <Search className="w-5 h-5" />
            </Link>
            <button className="p-2 hover:text-gold transition-colors relative">
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gold text-gold-foreground text-[10px] flex items-center justify-center font-medium">
                  {wishlist.length}
                </span>
              )}
            </button>
            <button
              className="p-2 hover:text-gold transition-colors relative"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gold text-gold-foreground text-[10px] flex items-center justify-center font-medium">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden border-t border-border"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4 font-body text-sm tracking-widest uppercase">
              <Link to="/" onClick={() => setMobileOpen(false)} className="py-2">Home</Link>
              <Link to="/shop" onClick={() => setMobileOpen(false)} className="py-2">Shop</Link>
              <Link to="/shop?filter=new" onClick={() => setMobileOpen(false)} className="py-2">New Arrivals</Link>
              <Link to="/blog" onClick={() => setMobileOpen(false)} className="py-2">Blog</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
