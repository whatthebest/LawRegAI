"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { FileText, PlusCircle, Trash2 } from "lucide-react";
import { updateTemplate, type TemplateRecord } from "@/lib/api/templates";
import useSWR from 'swr';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fieldTypes = ["Text", "Number", "Checklist", "Person"] as const;

// Zod schema for a single field
const templateFieldSchema = z.object({
  name: z.string().min(1, "Field name is required."),
  label: z.string().min(1, "Field label is required."),
  type: z.enum(fieldTypes),
});


// Zod schema for the template form
const templateFormSchema = z.object({
  title: z.string().min(5, "Template title must be at least 5 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  fields: z.array(templateFieldSchema).min(1, "At least one field is required."),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface EditTemplateFormProps {
  templateId: string;
}

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(res => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "_")
    .replace(/^-+|-+$/g, "");


export default function EditTemplateForm({ templateId }: EditTemplateFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const { data: templateData, error, isLoading } = useSWR<{template: TemplateRecord}>(`/api/templates/${templateId}`, fetcher);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      title: "",
      description: "",
      fields: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  // Load the template data when it's fetched
  useEffect(() => {
    const templateToEdit = templateData?.template;
    if (templateToEdit) {
      form.reset({
        title: templateToEdit.title,
        description: templateToEdit.description,
        fields: templateToEdit.fields || [],
      });
    }
  }, [templateData, form]);

  const watchFieldArray = form.watch("fields");
  const controlledFields = fields.map((field, index) => {
    return {
      ...field,
      ...watchFieldArray[index]
    };
  });

  const handleAddField = () => {
    append({ name: "", label: "", type: "Text" });
  };

  const handleLabelChange = (index: number, value: string) => {
    form.setValue(`fields.${index}.label`, value);
    form.setValue(`fields.${index}.name`, slugify(value));
  };


  // Handle form submission
  async function onSubmit(data: TemplateFormValues) {
    try {
      await updateTemplate(templateId, data);

      toast({
        title: "Success!",
        description: "Document template updated successfully.",
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      });

      router.push("/sops?tab=templates");
    } catch (error: any) {
      const message = error?.message ?? "Failed to update template";
      toast({
        title: "Something went wrong",
        description: message,
        variant: "destructive",
      });
    }
  }
  
  // FIX: Handle error state after render with useEffect
  useEffect(() => {
    if (!isLoading && (error || !templateData?.template)) {
      toast({
        title: "Template not found",
        description: "The requested template could not be found.",
        variant: "destructive",
      });
      router.push("/sops?tab=templates");
    }
  }, [isLoading, error, templateData, toast, router]);


  if (isLoading || error || !templateData?.template) {
    return <MainLayout><p>Loading template...</p></MainLayout>
  }

  return (
    <MainLayout>
      <div className="space-y-4 mb-8">
        <Link href="/sops?tab=templates" className="text-sm text-primary hover:underline">
          &larr; Back to Template List
        </Link>
        <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
            <FileText className="w-10 h-10" />
            Edit Template
        </h1>
        <p className="text-lg text-muted-foreground">
          Modify the details of your document template below.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>Update the title, description, and content of the template.</CardDescription>
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
            </CardContent>
          </Card>
          
           <Card className="max-w-4xl mx-auto">
             <CardHeader>
              <CardTitle>Template Fields</CardTitle>
              <CardDescription>Add and configure the fields for this template.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {controlledFields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4 relative bg-background/50">
                  <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField
                        control={form.control}
                        name={`fields.${index}.label`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Field Label</FormLabel>
                            <FormControl>
                              <Input {...field} onChange={(e) => handleLabelChange(index, e.target.value)} placeholder="e.g., Project Name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`fields.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Field Name (auto)</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly placeholder="e.g., project_name"/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`fields.${index}.type`}
                        render={({ field }) => (
                           <FormItem>
                            <FormLabel>Field Type</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value}>
                               <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {fieldTypes.map(type => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={handleAddField} className="gap-2">
                <PlusCircle className="w-4 h-4" /> Add Field
              </Button>
               {form.formState.errors.fields && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.fields.message}
                  </p>
                )}
            </CardContent>
           </Card>

          <div className="max-w-4xl mx-auto flex justify-end">
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Update Template"}
            </Button>
          </div>
        </form>
      </Form>
    </MainLayout>
  );
}
