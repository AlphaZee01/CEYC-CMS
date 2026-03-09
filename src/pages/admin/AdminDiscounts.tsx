import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const discounts = [
  { id: 1, code: "HEEL20", type: "Percentage", value: 20, expires: "2026-04-30", uses: 14, status: "Active" },
  { id: 2, code: "WELCOME10", type: "Percentage", value: 10, expires: "2026-12-31", uses: 42, status: "Active" },
  { id: 3, code: "FLAT15", type: "Fixed", value: 15, expires: "2026-03-15", uses: 8, status: "Expiring Soon" },
  { id: 4, code: "SPRING25", type: "Percentage", value: 25, expires: "2026-06-01", uses: 0, status: "Active" },
];

export default function AdminDiscounts() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Discounts</h1>
          <p className="text-sm text-muted-foreground">Manage promo codes</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Create Code</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Discount Code</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Code (e.g. SUMMER30)" />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Value" type="number" />
                <Input placeholder="Type (Percentage / Fixed)" />
              </div>
              <Input placeholder="Expiration date" type="date" />
              <Button className="w-full" onClick={() => toast.success("Discount created (demo)")}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono font-medium">{d.code}</TableCell>
                  <TableCell>{d.type}</TableCell>
                  <TableCell>{d.type === "Percentage" ? `${d.value}%` : `$${d.value}`}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.expires}</TableCell>
                  <TableCell>{d.uses}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === "Active" ? "default" : "secondary"} className="text-xs">{d.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => toast.success("Deleted (demo)")}>
                      <Trash2 className="h-3.5 w-3.5" />
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
