
"use client";

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
import { useEffect } from "react";
import Link from "next/link";
import { UserCog } from "lucide-react";

const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  department: z.string().min(1, "Department is required."),
  role: z.enum(["Admin", "Editor", "Viewer"]),
});

type UserFormValues = z.infer<typeof userFormSchema>;

// Mock data - in a real app, this would come from an API
const mockUsers = [
    { name: "Jane Doe", email: "jane@company.com", department: "Operations", role: "Admin" },
    { name: "John Smith", email: "john@company.com", department: "Engineering", role: "Editor" },
    { name: "Alice Johnson", email: "alice@company.com", department: "HR", role: "Viewer" },
];
const departments = ["Operations", "Engineering", "HR", "Marketing", "Finance"];
const roles = ["Admin", "Editor", "Viewer"];

export default function EditUserPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userEmail = searchParams.get('email');

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
  });

  useEffect(() => {
    if (userEmail) {
      const userToEdit = mockUsers.find(u => u.email === userEmail);
      if (userToEdit) {
        form.reset(userToEdit);
      } else {
        toast({
          title: "User not found",
          description: "The requested user could not be found.",
          variant: "destructive",
        });
        router.push('/admin');
      }
    }
  }, [userEmail, form, router, toast]);

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
         <Link href="/admin" className="text-sm text-primary hover:underline">
            &larr; Back to Admin Panel
        </Link>
        <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
            <UserCog className="w-10 h-10" />
            Edit User
        </h1>
        <p className="text-lg text-muted-foreground">
          Modify the user's details and permissions below.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Change the user's name, department, or role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl><Input {...field} disabled /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {departments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {roles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
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
