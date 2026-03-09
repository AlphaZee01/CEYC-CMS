import { Package, ShoppingCart, DollarSign, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { products } from "@/data/products";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

const salesData = [
  { month: "Jan", revenue: 2400 }, { month: "Feb", revenue: 3200 },
  { month: "Mar", revenue: 2800 }, { month: "Apr", revenue: 4100 },
  { month: "May", revenue: 3600 }, { month: "Jun", revenue: 4800 },
];

const ordersData = [
  { month: "Jan", orders: 18 }, { month: "Feb", orders: 24 },
  { month: "Mar", orders: 21 }, { month: "Apr", orders: 32 },
  { month: "May", orders: 28 }, { month: "Jun", orders: 38 },
];

const categoryData = [
  { name: "Stiletto", value: 5 }, { name: "Block Heel", value: 3 },
  { name: "Platform", value: 2 }, { name: "Wedge", value: 2 },
];

const COLORS = [
  "hsl(0, 0%, 15%)", "hsl(42, 60%, 57%)", "hsl(30, 25%, 75%)", "hsl(0, 0%, 50%)",
];

const recentOrders = [
  { id: "#1024", customer: "Sarah M.", total: 89, status: "Shipped", date: "Mar 8" },
  { id: "#1023", customer: "Emily R.", total: 143, status: "Processing", date: "Mar 7" },
  { id: "#1022", customer: "Jessica L.", total: 65, status: "Delivered", date: "Mar 6" },
  { id: "#1021", customer: "Amy K.", total: 178, status: "Processing", date: "Mar 5" },
  { id: "#1020", customer: "Diana W.", total: 95, status: "Shipped", date: "Mar 4" },
];

const statsCards = [
  { label: "Total Products", value: products.length, icon: Package, change: "+3 this week" },
  { label: "Total Orders", value: 161, icon: ShoppingCart, change: "+12 this month" },
  { label: "Revenue", value: "$18,940", icon: DollarSign, change: "+18% vs last month" },
  { label: "Customers", value: 89, icon: Users, change: "+5 this week" },
];

export default function AdminDashboard() {
  const lowStock = products.filter((p) => !p.inStock).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back to HeelVault admin.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-semibold mt-1">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" /> {s.change}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStock > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm">{lowStock} product(s) out of stock. Review inventory.</p>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue</CardTitle>
            <CardDescription>Monthly revenue overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,90%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${v}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(0,0%,15%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders</CardTitle>
            <CardDescription>Monthly order trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,90%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="hsl(42,60%,57%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{o.id}</span>
                    <span className="text-sm text-muted-foreground">{o.customer}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      o.status === "Delivered" ? "bg-emerald-100 text-emerald-700" :
                      o.status === "Shipped" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{o.status}</span>
                    <span className="text-sm font-medium">${o.total}</span>
                    <span className="text-xs text-muted-foreground">{o.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Category</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
