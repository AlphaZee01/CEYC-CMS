import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";

const customers = [
  { id: 1, name: "Sarah Mitchell", email: "sarah@email.com", orders: 5, spent: 432, joined: "2025-11-12", status: "Active" },
  { id: 2, name: "Emily Rogers", email: "emily@email.com", orders: 3, spent: 287, joined: "2025-12-03", status: "Active" },
  { id: 3, name: "Jessica Lane", email: "jessica@email.com", orders: 8, spent: 612, joined: "2025-09-18", status: "Active" },
  { id: 4, name: "Amy Kim", email: "amy@email.com", orders: 1, spent: 65, joined: "2026-02-20", status: "Active" },
  { id: 5, name: "Diana Wells", email: "diana@email.com", orders: 4, spent: 340, joined: "2025-10-05", status: "Inactive" },
  { id: 6, name: "Nina Patel", email: "nina@email.com", orders: 2, spent: 156, joined: "2026-01-15", status: "Active" },
];

export default function AdminCustomers() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">{customers.length} registered customers</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                        {c.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{c.orders}</TableCell>
                  <TableCell className="font-medium">${c.spent}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.joined}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "Active" ? "default" : "secondary"} className="text-xs">
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
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
