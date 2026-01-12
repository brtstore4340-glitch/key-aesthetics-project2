import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Settings as SettingsIcon, User, Shield, Bell, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm({
    defaultValues: {
      name: user?.name || "",
      username: user?.username || "",
    }
  });

  const onSubmit = (data: any) => {
    toast({
      title: "Settings updated",
      description: "Your profile changes have been saved successfully.",
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <aside className="space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3 bg-primary/10 text-primary hover:bg-primary/20">
            <User className="w-4 h-4" />
            Profile
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-secondary/50 hover:text-foreground">
            <Shield className="w-4 h-4" />
            Security
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-secondary/50 hover:text-foreground">
            <Bell className="w-4 h-4" />
            Notifications
          </Button>
        </aside>

        <div className="space-y-6">
          <Card className="border-border/40 shadow-xl shadow-black/20 overflow-hidden">
            <CardHeader className="bg-secondary/20 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your account details and display name</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-secondary/30 border-border/40 focus:ring-primary/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} disabled className="bg-secondary/10 border-border/40 text-muted-foreground opacity-50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-4 border-t border-border/40 flex justify-end">
                    <Button type="submit" className="gap-2 shadow-lg shadow-primary/20">
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-xl shadow-black/20">
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
              <CardDescription>Role-specific settings and interface options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-secondary/20 border border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">User Role</p>
                    <p className="text-sm text-muted-foreground">Your current permissions level</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                    {user?.role}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
