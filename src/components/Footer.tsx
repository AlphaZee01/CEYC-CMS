import { Link } from "react-router-dom";
import { Instagram, Facebook, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <h3 className="font-display text-2xl font-semibold mb-4">
              HEEL<span className="text-gold">VAULT</span>
            </h3>
            <p className="text-sm leading-relaxed opacity-70 font-body">
              Curated pre-loved designer heels. Sustainable luxury for the modern woman.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="opacity-70 hover:opacity-100 hover:text-gold transition-all" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="opacity-70 hover:opacity-100 hover:text-gold transition-all" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="opacity-70 hover:opacity-100 hover:text-gold transition-all" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-body text-xs tracking-widest uppercase mb-4 text-gold">Shop</h4>
            <ul className="space-y-3 text-sm opacity-70 font-body">
              <li><Link to="/shop" className="hover:opacity-100 transition-opacity">All Heels</Link></li>
              <li><Link to="/shop?type=stiletto" className="hover:opacity-100 transition-opacity">Stilettos</Link></li>
              <li><Link to="/shop?type=block" className="hover:opacity-100 transition-opacity">Block Heels</Link></li>
              <li><Link to="/shop?type=platform" className="hover:opacity-100 transition-opacity">Platforms</Link></li>
              <li><Link to="/shop?type=wedge" className="hover:opacity-100 transition-opacity">Wedges</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-body text-xs tracking-widest uppercase mb-4 text-gold">Company</h4>
            <ul className="space-y-3 text-sm opacity-70 font-body">
              <li><a href="#" className="hover:opacity-100 transition-opacity">About Us</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Contact</a></li>
              <li><Link to="/blog" className="hover:opacity-100 transition-opacity">Blog</Link></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Careers</a></li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-body text-xs tracking-widest uppercase mb-4 text-gold">Help</h4>
            <ul className="space-y-3 text-sm opacity-70 font-body">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Shipping Policy</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Returns & Exchanges</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Privacy Policy</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-12 pt-8 text-center text-xs opacity-50 font-body">
          © {new Date().getFullYear()} HeelVault. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
