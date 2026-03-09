import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const orders = [
  { id: "#1024", customer: "Sarah Mitchell", email: "sarah@email.com", items: 2, total: 154, status: "Shipped", date: "2026-03-08" },
  { id: "#1023", customer: "Emily Rogers", email: "emily@email.com", items: 1, total: 89, status: "Processing", date: "2026-03-07" },
  { id: "#1022", customer: "Jessica Lane", email: "jessica@email.com", items: 3, total: 198, status: "Delivered", date: "2026-03-06" },
  { id: "#1021", customer: "Amy Kim", email: "amy@email.com", items: 1, total: 65, status: "Processing", date: "2026-03-05" },
  { id: "#1020", customer: "Diana Wells", email: "diana@email.com", items: 2, total: 143, status: "Delivered", date: "2026-03-04" },
  { id: "#1019", customer: "Nina Patel", email: "nina@email.com", items: 1, total: 78, status: "Cancelled", date: "2026-03-03" },
  { id: "#1018", customer: "Olivia Brown", email: "olivia@email.com", items: 2, total: 167, status: "Shipped", date: "2026-03-02" },
  { id: "#1017", customer: "Rachel Green", email: "rachel@email.com", items: 1, total: 120, status: "Delivered", date: "2026-03-01" },
];

const statusColor: Record<string, string> = {
  Delivered: "bg-emerald-100 text-emerald-700",
  Shipped: "bg-blue-100 text-blue-700",
  Processing: "bg-amber-100 text-amber-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default function AdminOrders() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} orders total</p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {["Processing", "Shipped", "Delivered", "Cancelled"].map((s) => (
          <Card key={s}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold">{orders.filter((o) => o.status === s).length}</p>
              <p className="text-xs text-muted-foreground mt-1">{s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{o.customer}</p>
                      <p className="text-xs text-muted-foreground">{o.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{o.items}</TableCell>
                  <TableCell className="font-medium">${o.total}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColor[o.status]} border-0 text-xs`}>{o.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.date}</TableCell>
                  <TableCell className="text-right">
                    <Select onValueChange={(v) => toast.success(`Order ${o.id} → ${v} (demo)`)}>
                      <SelectTrigger className="h-8 w-[130px]">
                        <SelectValue placeholder="Update" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
