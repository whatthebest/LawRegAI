"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/MainLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCog, Plus, X } from "lucide-react";

/** Unions aligned to your Zod schema */
type Department   = "Operations" | "Engineering" | "HR" | "Compliance"; // etc
type SystemRole   = "RegTechTeam" | "Manager" | "User";    // RBAC
type WorkflowRole = "Owner" | "Reviewer" | "Approver";     // SOP workflow

/** What we display in the table (matches /api/users) */
type DisplayUser = {
  id?: string;
  fullname: string;
  email: string;
  department: Department;
  systemRole: SystemRole;
  role: WorkflowRole;
};

/** Form model for creating a user (includes extras) */
type NewUserForm = {
  fullname: string;
  email: string;
  password: string;
  department: Department;
  systemRole: SystemRole;
  role: WorkflowRole;
  // optional extras
  employeeId?: string;
  contactNumber?: string;
  cluster?: string;
  group?: string;
  section?: string;
  managerName?: string;
  managerEmail?: string;
};



export default function AdminPage() {
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);

  // form state (with extras)
  const [form, setForm] = useState<NewUserForm>({
    fullname: "",
    email: "",
    password: "",
    department: "Operations",
    systemRole: "User",
    role: "Owner",
    // extras start empty
    employeeId: "",
    contactNumber: "",
    cluster: "",
    group: "",
    section: "",
    managerName: "",
    managerEmail: "",
  });

  const [error, setError] = useState<string>("");

  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isRegTechTeam = user?.systemRole === "RegTechTeam";

  // Load users from API
  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!isRegTechTeam) return;
    loadUsers();
  }, [isRegTechTeam]);

  useEffect(() => {
    if (!isLoading && !isRegTechTeam) {
      router.replace("/");
    }
  }, [isLoading, isRegTechTeam, router]);

  const resetForm = () => {
    setForm({
      fullname: "",
      email: "",
      password: "",
      department: "Operations",
      systemRole: "User",
      role: "Owner",
      employeeId: "",
      contactNumber: "",
      cluster: "",
      group: "",
      section: "",
      managerName: "",
      managerEmail: "",
      });
    setError("");
  };

  const onClose = () => {
    setOpen(false);
    resetForm();
  };

  // Helper: remove empty-string optional fields so Zod optional() passes
  function buildPayload(f: NewUserForm) {
    const payload: Record<string, any> = { ...f };
    const optionalKeys = [
      "employeeId",
      "contactNumber",
      "cluster",
      "group",
      "section",
      "managerName",
      "managerEmail",
    ] as const;

    for (const k of optionalKeys) {
      const v = payload[k];
      if (typeof v === "string" && v.trim() === "") {
        delete payload[k];
      }
    }
    return payload;
  }

  function stripEmpty<T extends Record<string, any>>(obj: T) {
    const out: any = { ...obj };
    [
      "employeeId","contactNumber","cluster","group",
      "section","managerName","managerEmail",
    ].forEach(k => {
      if (typeof out[k] === "string" && out[k].trim() === "") delete out[k];
    });
    return out;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
  
    // (optional) minimal client checks
    if (!form.fullname.trim() || !form.email.trim()) {
      setError("Full name and Email are required.");
      return;
    }
  
    // Build payload for /api/users
    const payload = stripEmpty({
      fullname: form.fullname,
      email: form.email,
      password: form.password,            // include ONLY if you want Auth account created
      department: form.department,
      systemRole: form.systemRole,
      role: form.role,
      employeeId: form.employeeId || undefined,
      contactNumber: form.contactNumber || undefined,
      cluster: form.cluster || undefined,
      group: form.group || undefined,
      section: form.section || undefined,
      managerName: form.managerName || undefined,
      managerEmail: form.managerEmail || undefined,
    });
  
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        const errText =
          typeof msg?.error === "string"
            ? msg.error
            : msg?.error?.formErrors?.join(", ") || "Failed to create user.";
        // 401/403 = not authenticated/authorized
        if (res.status === 401) {
          setError("Unauthenticated. Please log in.");
          return;
        }
        if (res.status === 403) {
          setError("You do not have permission to create users.");
          return;
        }
        setError(errText);
        return;
      }
  
      // refresh table and close modal
      await loadUsers();
      onClose();
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };
  

  if (!isRegTechTeam) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <Card className="max-w-md text-center">
            <CardHeader>
              <CardTitle>Access restricted</CardTitle>
              <CardDescription>You need RegTechTeam permissions to view the admin panel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => router.replace("/")}>Go to Overview</Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header with action on right */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
              <UserCog className="w-10 h-10" />
              Admin Panel
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage users, system settings, and overall configurations.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and manage system users and their roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead>Workflow Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium">{user.fullname}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>{user.systemRole}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/edit-user/${user.id}`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No users yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10 sm:items-center sm:p-6">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          {/* dialog */}
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl flex flex-col max-h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-4rem)] sm:p-6">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xl font-semibold">Add User</h2>
              <button
                aria-label="Close"
                className="rounded-full p-1 hover:bg-muted"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 -mr-4 max-h-full sm:pr-2 sm:-mr-2">
              <form onSubmit={onSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm">
                    {error}
                  </div>
                )}

                {/* Core fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} required />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Temporary password" required />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Department</label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value as Department })}
                    >
                      <option value="Operations">Operations</option>
                      <option value="Engineering">Engineering</option>
                      <option value="HR">HR</option>
                      <option value="Compliance">Compliance</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">System Role</label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.systemRole}
                      onChange={(e) => setForm({ ...form, systemRole: e.target.value as SystemRole })}
                    >
                      <option value="User">User</option>
                      <option value="Manager">Manager</option>
                      <option value="RegTechTeam">RegTechTeam</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Workflow Role</label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as WorkflowRole })}
                    >
                      <option value="Owner">Owner</option>
                      <option value="Reviewer">Reviewer</option>
                      <option value="Approver">Approver</option>
                    </select>
                  </div>
                </div>

                {/* Additional Details (optional extras) */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Additional Details (optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Employee ID</label>
                      <Input value={form.employeeId ?? ""} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Contact Number</label>
                      <Input type="tel" value={form.contactNumber ?? ""} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="e.g., 0912345678" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Cluster</label>
                      <Input value={form.cluster ?? ""} onChange={(e) => setForm({ ...form, cluster: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Group (กลุ่ม)</label>
                      <Input value={form.group ?? ""} onChange={(e) => setForm({ ...form, group: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Section (ส่วนงาน)</label>
                      <Input value={form.section ?? ""} onChange={(e) => setForm({ ...form, section: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Manager Name</label>
                      <Input value={form.managerName ?? ""} onChange={(e) => setForm({ ...form, managerName: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Manager Email</label>
                      <Input type="email" value={form.managerEmail ?? ""} onChange={(e) => setForm({ ...form, managerEmail: e.target.value })} placeholder="manager@company.com" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 flex-shrink-0">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

