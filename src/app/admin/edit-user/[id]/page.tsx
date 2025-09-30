"use client";

import { useEffect, useState } from "react";
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
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserCog } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";




/* ---- typed options (must match backend/Zod) ---- */
const departments = ["Operations", "Engineering", "HR", "Compliance"] as const;
type Department = (typeof departments)[number];

const systemRoles = ["RegTechTeam", "Manager", "User"] as const;   // RBAC
type SystemRole = (typeof systemRoles)[number];

const workflowRoles = ["Owner", "Reviewer", "Approver"] as const;  // SOP workflow
type WorkflowRole = (typeof workflowRoles)[number];

/* ---- schema used by RHF (aligned to backend) ---- */
const userFormSchema = z.object({
  fullname: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email."),     // disabled in UI (key)
  department: z.enum(departments),
  systemRole: z.enum(systemRoles),
  role: z.enum(workflowRoles),
  // optional extras (same as profileExtrasSchema)
  employeeId: z.string().optional(),
  contactNumber: z.string().optional(),
  cluster: z.string().optional(),
  businessUnit: z.string().optional(),
  team: z.string().optional(),
  managerName: z.string().optional(),
  managerEmail: z.string().email().optional(),
  groupTh: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function EditUserPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const router = useRouter();
  const uidParam = decodeURIComponent(params.id); // Get the ID from params



  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    // safe minimal defaults; we'll replace with form.reset() after fetching
    defaultValues: {
      fullname: "",
      email: "",
      department: "Operations",
      systemRole: "User",
      role: "Owner",
    },
  });

  // load user from your API and prefill the form

useEffect(() => {
  let ignore = false;
  (async () => {
    if (!uidParam) {
      toast({ title: "Missing id", description: "No user id was provided.", variant: "destructive" });
      router.push("/admin");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/by-id/${encodeURIComponent(uidParam)}`, { cache: "no-store" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        toast({ title: "User not found", description: t || "The requested user could not be found.", variant: "destructive" });
        router.push("/admin");
        return;
      }
      const data = await res.json();
      if (!ignore) form.reset(data);
    } catch {
      toast({ title: "Error", description: "Failed to load user.", variant: "destructive" });
      router.push("/admin");
    } finally {
      if (!ignore) setLoading(false);
    }
  })();
  return () => { ignore = true; };
}, [uidParam, form, router, toast]);

function stripEmpty<T extends Record<string, any>>(obj: T) {
  const out: any = { ...obj };
  ["employeeId","contactNumber","cluster","businessUnit","team","managerName","managerEmail","groupTh"].forEach(k => {
    if (typeof out[k] === "string" && out[k].trim() === "") delete out[k];
  });
  return out;
}

async function onSubmit(values: UserFormValues) {
  setSaving(true);
  try {
    const payload = stripEmpty(values);
    const res = await fetch(`/api/users/by-id/${encodeURIComponent(uidParam)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = await res.json().catch(() => ({}));
      const errText =
        typeof msg?.error === "string"
          ? msg.error
          : msg?.error?.formErrors?.join(", ") || "Unknown error";
      toast({ title: "Update failed", description: errText, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: `The details for ${values.fullname} have been updated.` });
    router.push("/admin");
  } catch {
    toast({ title: "Network error", description: "Could not save changes.", variant: "destructive" });
  } finally {
    setSaving(false);
  }
}



async function onDelete() {
  setDeleting(true);
  try {
    const res = await fetch(`/api/users/by-id/${encodeURIComponent(uidParam)}`, { method: "DELETE" });
    if (!res.ok) {
      const msg = await res.json().catch(() => ({}));
      const errText = typeof msg?.error === "string" ? msg.error : JSON.stringify(msg?.error ?? "Unknown error");
      toast({ title: "Delete failed", description: errText, variant: "destructive" });
      return;
    }
    toast({ title: "User deleted" });
    router.push("/admin");
  } catch {
    toast({ title: "Network error", description: "Could not delete user.", variant: "destructive" });
  } finally {
    setDeleting(false);
  }
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
        <p className="text-lg text-muted-foreground">Modify the user's details and permissions below.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Change the user's profile, roles, and optional metadata.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Full name */}
              <FormField name="fullname" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Email (identifier) */}
              <FormField name="email" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl><Input {...field} disabled /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Department */}
              <FormField name="department" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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

              {/* System Role (RBAC) */}
              <FormField name="systemRole" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>System Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a system role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {systemRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Workflow Role */}
              <FormField name="role" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Workflow Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a workflow role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workflowRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Optional extras */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="employeeId" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="contactNumber" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="cluster" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cluster</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="businessUnit" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Unit</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="team" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="managerName" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="managerEmail" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager Email</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="groupTh" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>กลุ่ม (groupTh)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              
              <div className="flex items-center justify-between pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive">Delete user</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the user account (Auth) and their profile data.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleting}>No</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} disabled={deleting}>
                        {deleting ? "Deleting..." : "Yes, delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button type="submit" size="lg" disabled={loading || saving || deleting}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </MainLayout>
  );
}
