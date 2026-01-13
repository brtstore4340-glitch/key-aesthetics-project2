import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Settings as SettingsIcon, User, Shield, Save, UserPlus, Trash2, ShieldCheck, Tags, Upload, FileDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema, insertUserSchema, type Category } from "@shared/schema";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

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

  const categoryForm = useForm({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      colorTag: "#D4B16A",
    }
  });

  const [categoryDrafts, setCategoryDrafts] = useState<Record<number, { name: string; colorTag: string }>>({});

  const { data: usersList } = useQuery({
    queryKey: [api.users.list.path],
    enabled: user?.role === "admin",
  });

  const { data: categoriesList, isLoading: isLoadingCategories } = useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return api.categories.list.responses[200].parse(await res.json());
    },
    enabled: user?.role === "admin",
  });

  useEffect(() => {
    if (!Array.isArray(categoriesList)) return;
    setCategoryDrafts(
      categoriesList.reduce(
        (acc, category) => {
          acc[category.id] = { name: category.name ?? "", colorTag: category.colorTag ?? "#000000" };
          return acc;
        },
        {} as Record<number, { name: string; colorTag: string }>,
      ),
    );
  }, [categoriesList]);

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.users.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User created", description: "New user added successfully." });
      newUserForm.reset();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.users.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User deleted" });
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.categories.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({ title: "Category added" });
      categoryForm.reset({ name: "", colorTag: "#D4B16A" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Category> }) => {
      const res = await apiRequest("PUT", buildUrl(api.categories.update.path, { id }), data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({ title: "Category updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.categories.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({ title: "Category deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: any) => {
    toast({
      title: "Settings updated",
      description: "Your profile changes have been saved successfully.",
    });
  };

  const handleUserTemplateExport = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Username: "putthipat", "Full Name": "Putthipat", Role: "staff", PIN: "1234", Active: "TRUE" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "user_template.xlsx");
  };

  const handleUserFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, string>[];

        const formattedUsers = json
          .map((row) => {
            const rawUsername = String(row.Username ?? row.username ?? "").trim();
            const rawName = String(row["Full Name"] ?? row.Name ?? row.name ?? rawUsername).trim();
            const rawRole = String(row.Role ?? row.role ?? "staff").toLowerCase();
            const pinFallback = rawRole === "accounting" ? "8888" : "1234";
            const rawPin = String(row.PIN ?? row.Pin ?? row.pin ?? row.Password ?? pinFallback).trim();
            const rawActive = String(row.Active ?? row.active ?? "true").toLowerCase();
            const isActive = !["false", "0", "no"].includes(rawActive);

            if (!rawUsername || !rawPin || !rawName) return null;

            return {
              username: rawUsername,
              name: rawName,
              role: ["admin", "staff", "accounting"].includes(rawRole) ? rawRole : "staff",
              pin: rawPin,
              isActive,
            };
          })
          .filter(
            (
              entry,
            ): entry is { username: string; name: string; role: string; pin: string; isActive: boolean } => Boolean(entry),
          );

        if (!formattedUsers.length) {
          toast({ title: "No valid rows found", description: "Please check the template format.", variant: "destructive" });
          return;
        }

        await apiRequest("POST", api.users.batchCreate.path, formattedUsers);
        queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
        toast({ title: "Users uploaded", description: `Uploaded ${formattedUsers.length} users.` });
      } catch (err: any) {
        toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
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
          {user?.role === "admin" && (
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-secondary/50 hover:text-foreground">
              <Tags className="w-4 h-4" />
              Product Categories
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
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle>Add New User</CardTitle>
                        <CardDescription>Create a new staff or accounting account</CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleUserTemplateExport} className="gap-2">
                        <FileDown className="w-4 h-4" /> Template
                      </Button>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={handleUserFileUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          title="Upload Excel"
                          name="userUpload"
                          id="userUpload"
                        />
                        <Button variant="outline" size="sm" className="gap-2 pointer-events-none">
                          <Upload className="w-4 h-4" /> Batch Upload
                        </Button>
                      </div>
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
                          <p className="text-xs text-muted-foreground">
                            @{u.username} • {u.role}
                            {u.isActive === false && <span className="ml-2 text-destructive">Disabled</span>}
                          </p>
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

              <Card className="border-border/40 shadow-xl shadow-black/20 overflow-hidden">
                <CardHeader className="bg-secondary/20 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Tags className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle>Product Categories</CardTitle>
                      <CardDescription>Manage category labels used for product organization</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <Form {...categoryForm}>
                    <form
                      onSubmit={categoryForm.handleSubmit((data) => createCategoryMutation.mutate(data))}
                      className="grid gap-4 md:grid-cols-[1fr_auto_auto] items-end"
                    >
                      <FormField
                        control={categoryForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Skincare" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={categoryForm.control}
                        name="colorTag"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color Tag</FormLabel>
                            <FormControl>
                              <Input {...field} type="color" className="h-10 w-16 p-1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="h-10" disabled={createCategoryMutation.isPending}>
                        Add Category
                      </Button>
                    </form>
                  </Form>

                  <div className="space-y-3">
                    {isLoadingCategories && (
                      <div className="text-sm text-muted-foreground">Loading categories...</div>
                    )}
                    {!isLoadingCategories && (!categoriesList || categoriesList.length === 0) && (
                      <div className="text-sm text-muted-foreground">No categories yet. Add one above.</div>
                    )}
                    {categoriesList?.map((category: Category) => {
                      const draft = categoryDrafts[category.id] ?? {
                        name: category.name ?? "",
                        colorTag: category.colorTag ?? "#000000",
                      };
                      const hasChanges = draft.name !== category.name || draft.colorTag !== category.colorTag;

                      return (
                        <div
                          key={category.id}
                          className="grid gap-3 rounded-lg border border-border/40 bg-secondary/20 p-3 md:grid-cols-[1fr_auto_auto]"
                        >
                          <Input
                            value={draft.name}
                            onChange={(event) =>
                              setCategoryDrafts((prev) => ({
                                ...prev,
                                [category.id]: { ...draft, name: event.target.value },
                              }))
                            }
                            placeholder="Category name"
                          />
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={draft.colorTag}
                              onChange={(event) =>
                                setCategoryDrafts((prev) => ({
                                  ...prev,
                                  [category.id]: { ...draft, colorTag: event.target.value },
                                }))
                              }
                              className="h-10 w-16 p-1"
                            />
                            <span className="text-xs text-muted-foreground">{draft.colorTag}</span>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!hasChanges || updateCategoryMutation.isPending}
                              onClick={() =>
                                updateCategoryMutation.mutate({
                                  id: category.id,
                                  data: { name: draft.name, colorTag: draft.colorTag },
                                })
                              }
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => deleteCategoryMutation.mutate(category.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
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
