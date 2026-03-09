import { useState } from "react";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", address: "", city: "", zip: "", country: "", paymentMethod: "card",
  });

  const shipping = totalPrice >= 100 ? 0 : 12;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Order placed successfully!");
    clearCart();
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md px-4">
          <CheckCircle className="w-16 h-16 mx-auto text-gold mb-4" />
          <h1 className="font-display text-2xl mb-2">Order Confirmed!</h1>
          <p className="text-sm font-body text-muted-foreground mb-6">
            Thank you for your purchase. You'll receive a confirmation email shortly.
          </p>
          <button onClick={() => navigate("/")} className="bg-primary text-primary-foreground px-8 py-3 text-xs tracking-widest uppercase font-body font-medium hover:bg-gold hover:text-gold-foreground transition-colors">
            Continue Shopping
          </button>
        </motion.div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl mb-4">Your cart is empty</h1>
          <button onClick={() => navigate("/shop")} className="text-sm font-body underline hover:text-gold">Go to shop</button>
        </div>
      </div>
    );
  }

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen">
      <div className="bg-beige py-12">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h1 className="font-display text-3xl md:text-4xl">Checkout</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="font-display text-lg mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Full Name" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className="bg-secondary px-4 py-3 text-sm font-body rounded-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                <input required type="email" placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} className="bg-secondary px-4 py-3 text-sm font-body rounded-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                <input placeholder="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="bg-secondary px-4 py-3 text-sm font-body rounded-sm focus:outline-none focus:ring-1 focus:ring-gold md:col-span-2" />
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg mb-4">Shipping Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Street Address" value={form.address} onChange={(e) => update("address", e.target.value)} className="bg-secondary px-4 py-3 text-sm font-body rounded-sm focus:outline-none focus:ring-1 focus:ring-gold md:col-span-2" />
                <input required placeholder="City" value={form.city} onChange={(e) => update("city", e.target.value)} className="bg-secondary px-4 py-3 text-sm font-body rounded-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                <input required placeholder="ZIP Code" value={form.zip} onChange={(e) => update("zip", e.target.value)} className="bg-secondary px-4 py-3 text-sm font-body rounded-sm focus:outline-none focus:ring-1 focus:ring-gold" />
                <input required placeholder="Country" value={form.country} onChange={(e) => update("country", e.target.value)} className="bg-secondary px-4 py-3 text-sm font-body rounded-sm focus:outline-none focus:ring-1 focus:ring-gold md:col-span-2" />
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg mb-4">Payment Method</h3>
              <div className="flex gap-4">
                {["card", "paypal"].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => update("paymentMethod", method)}
                    className={`flex-1 px-4 py-3 text-sm font-body rounded-sm border transition-colors capitalize ${
                      form.paymentMethod === method ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-gold"
                    }`}
                  >
                    {method === "card" ? "Credit Card" : "PayPal"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground font-body mt-3">
                This is a simulated checkout. No real payment will be processed.
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-secondary p-8 rounded-sm h-fit sticky top-24">
            <h3 className="font-display text-lg mb-6">Order Summary</h3>
            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3">
                  <img src={item.product.images[0]} alt={item.product.name} className="w-14 h-14 object-cover rounded-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-body font-medium truncate">{item.product.name}</p>
                    <p className="text-[10px] text-muted-foreground font-body">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-xs font-body font-semibold">${item.product.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm font-body border-t border-border pt-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${totalPrice}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? "Free" : `$${shipping}`}</span></div>
              <div className="border-t border-border pt-3 flex justify-between font-semibold text-base">
                <span>Total</span><span>${totalPrice + shipping}</span>
              </div>
            </div>
            <button
              type="submit"
              className="w-full mt-6 bg-gold text-gold-foreground py-4 text-xs tracking-widest uppercase font-body font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Place Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
