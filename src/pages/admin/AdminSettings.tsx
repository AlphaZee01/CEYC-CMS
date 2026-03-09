import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your store configuration</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Store Information</CardTitle>
            <CardDescription>Basic store details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Store Name</label>
              <Input defaultValue="HeelVault" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Contact Email</label>
              <Input defaultValue="hello@heelvault.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <Input defaultValue="+1 (555) 123-4567" />
            </div>
            <Button onClick={() => toast.success("Settings saved (demo)")}>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipping</CardTitle>
            <CardDescription>Default shipping rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Standard ($)</label>
                <Input defaultValue="5.99" type="number" step="0.01" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Express ($)</label>
                <Input defaultValue="12.99" type="number" step="0.01" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Free Shipping Threshold ($)</label>
              <Input defaultValue="100" type="number" />
            </div>
            <Button onClick={() => toast.success("Shipping saved (demo)")}>Save</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Social Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Instagram</label>
              <Input defaultValue="@heelvault" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">TikTok</label>
              <Input defaultValue="@heelvault" />
            </div>
            <Button onClick={() => toast.success("Social links saved (demo)")}>Save</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
