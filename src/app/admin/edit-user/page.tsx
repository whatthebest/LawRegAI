"use client";

import { useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserCog } from "lucide-react";

/* ---------- centralize options (typed) ---------- */
const departments = ["Operations", "Engineering", "HR"] as const;
type Department = typeof departments[number];

const roles = ["Admin", "RegTechTeam", "Manager", "User"] as const;
type Role = typeof roles[number];

/* ---------- schema matches your unions ---------- */
const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  department: z.enum(departments),
  role: z.enum(roles),
});
type UserFormValues = z.infer<typeof userFormSchema>;

/* ---------- mock data typed with the same unions ---------- */
type User = { name: string; email: string; department: Department; role: Role };

const mockUsers: User[] = [
  { name: "Jane Doe",  email: "jane@company.com",  department: "Operations",  role: "Admin" },
  { name: "John Smith",email: "john@company.com",  department: "Engineering", role: "Manager" },
  { name: "Alice Johnson", email: "alice@company.com", department: "HR", role: "User" },
];

export default function EditUserPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailParam = useMemo(
    () => decodeURIComponent(searchParams.get("email") ?? ""),
    [searchParams]
  );

  const userToEdit = useMemo(
    () => mockUsers.find(u => u.email === emailParam),
    [emailParam]
  );

  /* defaultValues now perfectly typed */
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: userToEdit ?? {
      name: "",
      email: emailParam,
      department: "Operations",
      role: "User",
    },
  });

  useEffect(() => {
    if (!userToEdit) {
      toast({ title: "User not found", description: "The requested user could not be found.", variant: "destructive" });
      router.push("/admin");
    }
  }, [userToEdit, toast, router]);

  function onSubmit(data: UserFormValues) {
    console.log(data);
    toast({
      title: "User Updated Successfully!",
      description: `The details for ${data.name} have been saved.`,
      className: "bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-600",
    });
    router.push("/admin");
  }

  return (
    <MainLayout>
      <div className="space-y-4 mb-8">
        <Link href="/admin" className="text-sm text-primary hover:underline">&larr; Back to Admin Panel</Link>
        <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
          <UserCog className="w-10 h-10" /> Edit User
        </h1>
        <p className="text-lg text-muted-foreground">Modify the user's details and permissions below.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Change the user's name, department, or role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField name="name" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="email" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl><Input {...field} disabled /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="department" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  {/* shadcn Select: use defaultValue to show current value */}
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="role" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end pt-4">
                <Button type="submit" size="lg">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </MainLayout>
  );
}
