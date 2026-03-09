import { Link } from "react-router-dom";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { motion } from "framer-motion";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-display text-2xl mb-2">Your Cart is Empty</h1>
          <p className="text-sm font-body text-muted-foreground mb-6">Looks like you haven't added anything yet.</p>
          <Link
            to="/shop"
            className="inline-block bg-primary text-primary-foreground px-8 py-3 text-xs tracking-widest uppercase font-body font-medium hover:bg-gold hover:text-gold-foreground transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  const shipping = totalPrice >= 100 ? 0 : 12;

  return (
    <div className="min-h-screen">
      <div className="bg-beige py-12">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h1 className="font-display text-3xl md:text-4xl">Shopping Cart</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Items */}
          <div className="lg:col-span-2 space-y-6">
            {items.map((item, i) => (
              <motion.div
                key={item.product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-4 md:gap-6 pb-6 border-b border-border"
              >
                <Link to={`/product/${item.product.id}`}>
                  <img src={item.product.images[0]} alt={item.product.name} className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-sm bg-secondary" />
                </Link>
                <div className="flex-1">
                  <p className="text-[10px] tracking-widest uppercase text-muted-foreground font-body">{item.product.brand}</p>
                  <Link to={`/product/${item.product.id}`}>
                    <h3 className="text-sm font-body font-medium hover:text-gold transition-colors">{item.product.name}</h3>
                  </Link>
                  <p className="text-xs text-muted-foreground font-body mt-1">Size {item.product.size} · {item.product.condition}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 border border-border rounded-sm">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-2 hover:bg-secondary transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-body w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-2 hover:bg-secondary transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-body font-semibold">${item.product.price * item.quantity}</span>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.product.id)} className="self-start p-1 hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-secondary p-8 rounded-sm h-fit sticky top-24">
            <h3 className="font-display text-lg mb-6">Order Summary</h3>
            <div className="space-y-3 text-sm font-body">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${totalPrice}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? "Free" : `$${shipping}`}</span></div>
              {shipping > 0 && <p className="text-[10px] text-muted-foreground">Free shipping on orders over $100</p>}
              <div className="border-t border-border pt-3 flex justify-between font-semibold text-base">
                <span>Total</span><span>${totalPrice + shipping}</span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="block w-full mt-6 bg-gold text-gold-foreground text-center py-4 text-xs tracking-widest uppercase font-body font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Proceed to Checkout
            </Link>
            <Link to="/shop" className="block w-full mt-3 text-center text-xs font-body text-muted-foreground underline hover:text-foreground transition-colors">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
