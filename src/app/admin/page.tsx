"use client";

import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { UserCog, Plus, X } from "lucide-react";

type User = {
  name: string;
  email: string;
  department: "Operations" | "Engineering" | "HR";
  role: "Admin" | "RegTechTeam" | "Manager" | "User";
};

const initialUsers: User[] = [
  { name: "Jane Doe",  email: "jane@company.com",  department: "Operations",  role: "Admin"  },
  { name: "John Smith",email: "john@company.com",  department: "Engineering", role: "Manager" },
  { name: "Alice Johnson", email: "alice@company.com", department: "HR", role: "User" },
];

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);

  // modal state
  const [open, setOpen] = useState(false);

  // form state
  const [form, setForm] = useState<User>({
    name: "",
    email: "",
    department: "Operations",
    role: "User",
  });
  const [error, setError] = useState<string>("");

  const resetForm = () => {
    setForm({ name: "", email: "", department: "Operations", role: "User" });
    setError("");
  };

  const onClose = () => {
    setOpen(false);
    resetForm();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // basic validation
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and Email are required.");
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (!emailOk) {
      setError("Please enter a valid email address.");
      return;
    }
    const exists = users.some(u => u.email.toLowerCase() === form.email.toLowerCase());
    if (exists) {
      setError("This email already exists.");
      return;
    }

    setUsers(prev => [...prev, form]);
    onClose();
  };

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
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.email}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/edit-user?email=${encodeURIComponent(user.email)}`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No users yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lightweight modal (no extra deps) */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          {/* dialog */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Add User</h2>
              <button
                aria-label="Close"
                className="rounded-full p-1 hover:bg-muted"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Department</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.department}
                    onChange={(e) =>
                      setForm({ ...form, department: e.target.value as User["department"] })
                    }
                  >
                    <option value="Operations">Operations</option>
                    <option value="Engineering">Engineering</option>
                    <option value="HR">HR</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Role</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value as User["role"] })
                    }
                  >
                    <option value="User">User</option>
                    <option value="Manager">Manager</option>
                    <option value="RegTechTeam">RegTechTeam</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
