import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

const revenueData = [
  { month: "Oct", revenue: 3200 }, { month: "Nov", revenue: 4100 },
  { month: "Dec", revenue: 5800 }, { month: "Jan", revenue: 2400 },
  { month: "Feb", revenue: 3200 }, { month: "Mar", revenue: 4800 },
];

const trafficData = [
  { day: "Mon", visitors: 120 }, { day: "Tue", visitors: 180 },
  { day: "Wed", visitors: 150 }, { day: "Thu", visitors: 210 },
  { day: "Fri", visitors: 280 }, { day: "Sat", visitors: 340 },
  { day: "Sun", visitors: 190 },
];

const topProducts = [
  { name: "Navy Stilettos", sales: 24 },
  { name: "Black Stilettos", sales: 20 },
  { name: "Platform Sandals", sales: 18 },
  { name: "Block Heels", sales: 15 },
  { name: "Wedge Heels", sales: 12 },
];

const conversionData = [
  { month: "Oct", rate: 2.1 }, { month: "Nov", rate: 2.8 },
  { month: "Dec", rate: 3.4 }, { month: "Jan", rate: 2.5 },
  { month: "Feb", rate: 3.0 }, { month: "Mar", rate: 3.6 },
];

export default function AdminAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Store performance insights</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(42,60%,57%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(42,60%,57%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,90%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${v}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(42,60%,57%)" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Traffic</CardTitle>
            <CardDescription>Unique visitors this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,90%)" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="visitors" fill="hsl(0,0%,15%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products</CardTitle>
            <CardDescription>By units sold</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,90%)" />
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="name" fontSize={11} width={110} />
                <Tooltip />
                <Bar dataKey="sales" fill="hsl(42,60%,57%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Rate</CardTitle>
            <CardDescription>Visitor to purchase %</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,90%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Rate"]} />
                <Line type="monotone" dataKey="rate" stroke="hsl(0,0%,15%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(42,60%,57%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
