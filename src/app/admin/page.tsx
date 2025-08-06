
"use client";

import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCog } from "lucide-react";
import Link from "next/link";

const users = [
    { name: "Jane Doe", email: "jane@company.com", department: "Operations", role: "Admin" },
    { name: "John Smith", email: "john@company.com", department: "Engineering", role: "Editor" },
    { name: "Alice Johnson", email: "alice@company.com", department: "HR", role: "Viewer" },
];

export default function AdminPage() {
  return (
    <MainLayout>
      <div className="space-y-4 mb-8">
        <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
            <UserCog className="w-10 h-10" />
            Admin Panel
        </h1>
        <p className="text-lg text-muted-foreground">
          Manage users, system settings, and overall configurations.
        </p>
      </div>

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
                    {users.map(user => (
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
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
