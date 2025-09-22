
"use client";

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
import { createTemplate } from "@/lib/api/templates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useState } from "react";
import { Label } from "@/components/ui/label";


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

const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "_")
    .replace(/^-+|-+$/g, "");

// --- Add Field Dialog Component ---
function AddFieldDialog({ onAddField }: { onAddField: (field: z.infer<typeof templateFieldSchema>) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [label, setLabel] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState<typeof fieldTypes[number]>('Text');

    const handleLabelChange = (value: string) => {
        setLabel(value);
        setName(slugify(value));
    };

    const handleSave = () => {
        if (label.trim() && name.trim()) {
            onAddField({ label, name, type });
            setLabel('');
            setName('');
            setType('Text');
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <PlusCircle className="w-4 h-4" />
                    Add Field
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Field</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="field-label">Field Label</Label>
                        <Input id="field-label" value={label} onChange={(e) => handleLabelChange(e.target.value)} placeholder="e.g., Project Name" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="field-name">Field Name (auto)</Label>
                        <Input id="field-name" value={name} readOnly placeholder="e.g., project_name" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="field-type">Field Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as any)}>
                            <SelectTrigger id="field-type">
                                <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                            <SelectContent>
                                {fieldTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSave} disabled={!label.trim() || !name.trim()}>Add</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function CreateTemplateForm() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      title: "",
      description: "",
      fields: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  // Handle form submission
  async function onSubmit(data: TemplateFormValues) {
    try {
      await createTemplate(data);

      toast({
        title: "Success!",
        description: "Document template created successfully.",
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      });

      router.push("/sops?tab=templates");
    } catch (error: any) {
      const message = error?.message ?? "Failed to create template";
      toast({
        title: "Something went wrong",
        description: message,
        variant: "destructive",
      });
    }
  }

  return (
    <MainLayout>
      <div className="space-y-4 mb-8">
        <Link href="/sops?tab=templates" className="text-sm text-primary hover:underline">
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
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Template Details</CardTitle>
                <CardDescription>Fill out the form below to create a new template.</CardDescription>
              </div>
              <AddFieldDialog onAddField={(field) => append(field)} />
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
              
              <Separator />

              {/* Live Preview Area */}
              <div className="space-y-4">
                  <FormLabel>Template Fields Preview</FormLabel>
                  {fields.length === 0 ? (
                       <div className="text-center text-muted-foreground py-6 border-2 border-dashed rounded-lg">
                        <p>No fields added yet.</p>
                        <p className="text-sm">Click "Add Field" to get started.</p>
                      </div>
                  ) : (
                    <div className="space-y-3">
                         {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-4 p-3 border rounded-lg bg-background/50">
                                <div className="flex-1 space-y-1">
                                    <p className="font-medium">{form.watch(`fields.${index}.label`)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Name: <span className="font-mono">{form.watch(`fields.${index}.name`)}</span>, 
                                        Type: <span className="font-mono">{form.watch(`fields.${index}.type`)}</span>
                                    </p>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(index)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                         ))}
                    </div>
                  )}
                  {form.formState.errors.fields && (
                      <p className="text-sm font-medium text-destructive">
                        {form.formState.errors.fields.message}
                      </p>
                    )}
              </div>

            </CardContent>
          </Card>

            <div className="max-w-4xl mx-auto flex justify-end">
              <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Template"}
              </Button>
            </div>
        </form>
      </Form>
    </MainLayout>
  );
}
