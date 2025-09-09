"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";

// Zod schema for the template form
const templateFormSchema = z.object({
  title: z.string().min(5, "Template title must be at least 5 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  content: z.string().min(20, "Template content must be at least 20 characters."),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function CreateTemplateForm() {
  const { toast } = useToast();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
    },
  });

  // Handle form submission
  async function onSubmit(data: TemplateFormValues) {
    // In a real application, you would save this data to your database.
    console.log("Template data submitted:", data);

    toast({
      title: "Success!",
      description: "Document template created successfully.",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    });

    // Reset the form for a new entry
    form.reset();
  }

  return (
    <MainLayout>
      <div className="space-y-4 mb-8">
        <Link href="/sops" className="text-sm text-primary hover:underline">
          &larr; Back to Template List
        </Link>
        <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
            <FileText className="w-10 h-10" />
            Create New Template
        </h1>
        <p className="text-lg text-muted-foreground">
          Design a new reusable document template for your SOP steps.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>Fill out the form below to create a new template.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Budget Request Form" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this template is used for..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the main body of your document template here. You can use placeholders like {{variable_name}}."
                        {...field}
                        rows={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end pt-4">
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </MainLayout>
  );
}
