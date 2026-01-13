import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Settings as SettingsIcon, User, Shield, Bell, Save, UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { dbService } from "@/lib/services/dbService";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm({
    defaultValues: {
      name: user?.name || "",
      username: user?.username || "",
    }
  });

  const newUserForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      name: "",
      role: "staff",
      pin: "",
    }
  });

  const queryClient = useQueryClient();
  const { data: usersList } = useQuery({
    queryKey: ["users"],
    queryFn: async () => dbService.listUsers(),
    enabled: user?.role === "admin",
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return dbService.createUser(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User created", description: "New user added successfully." });
      newUserForm.reset();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await dbService.deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User deleted" });
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
          {user?.role === "admin" && (
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-secondary/50 hover:text-foreground">
              <ShieldCheck className="w-4 h-4" />
              User Management
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-secondary/50 hover:text-foreground">
            <Shield className="w-4 h-4" />
            Security
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

          {user?.role === "admin" && (
            <>
              <Card className="border-border/40 shadow-xl shadow-black/20 overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle>Add New User</CardTitle>
                      <CardDescription>Create a new staff or accounting account</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Form {...newUserForm}>
                    <form onSubmit={newUserForm.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={newUserForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newUserForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newUserForm.control}
                          name="pin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>4-Digit PIN</FormLabel>
                              <FormControl><Input {...field} maxLength={4} placeholder="1234" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newUserForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                  <SelectItem value="accounting">Accounting</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
                        Create User
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card className="border-border/40 shadow-xl shadow-black/20">
                <CardHeader>
                  <CardTitle>Existing Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.isArray(usersList) && usersList.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/40">
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">@{u.username} • {u.role}</p>
                        </div>
                        {u.id !== user.id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => deleteUserMutation.mutate(u.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
