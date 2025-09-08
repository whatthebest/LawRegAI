// src/app/template-document/page.tsx
"use client";

import Link from "next/link";
import { FileText, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockTemplates } from "@/lib/mockData";

export default function TemplateDocumentsPage() {
  return (
    <MainLayout>
      <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
            <FileText className="w-10 h-10" />
            Template Documents
          </h1>
          <p className="text-lg text-muted-foreground">
            Create and manage reusable document templates for your SOP steps.
          </p>
        </div>
        <Link href="/template-document/create" passHref>
            <Button className="gap-2">
                <PlusCircle className="w-4 h-4" />
                Create New Template
            </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Library</CardTitle>
          <CardDescription>Browse all available document templates.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTemplates.length > 0 ? (
                mockTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.title}</TableCell>
                    <TableCell className="text-muted-foreground max-w-sm truncate">{template.description}</TableCell>
                    <TableCell>{format(new Date(template.createdAt), "MMMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/template-document/edit/${template.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No templates found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
