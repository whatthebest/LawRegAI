// app/create-sop/CreateSopForm.tsx  (CLIENT component)
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Trash2 } from "lucide-react";
import { sopDepartments } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import Link from "next/link";
import useSWR from 'swr';
import type { TemplateRecord } from "@/lib/api/templates";

const fetcher = (url: string) => fetch(url).then(res => res.json());


// ---------- Zod schemas ----------
const sopStepSchema = z.object({
  stepOrder: z.number(),
  title: z.string().min(1, "Step title must be at least 3 characters."),
  detail: z.string().min(1, "Step detail must be at least 10 characters."),
  stepType: z.enum(["Sequence", "Decision"]),
  nextStepYes: z.string().optional(),
  nextStepNo: z.string().optional(),
  templateId: z.string().optional(),
  sla: z.coerce.number().int().positive("SLA must be a positive number."),
  owner: z.string().email("Owner must be a valid email."),
  reviewer: z.string().email("Reviewer must be a valid email."),
  approver: z.string().email("Approver must be a valid email."),
  attachments: z.array(z.instanceof(File)).optional(),
});

const sopFormSchema = z.object({
  sopId: z.string(),
  title: z.string().min(1, "SOP title must be at least 5 characters."),
  description: z.string().min(1, "Description must be at least 20 characters."),
  department: z.enum(["Operations", "Engineering", "HR", "Marketing"]),
  cluster: z.string().optional(),
  group: z.string().optional(),
  section: z.string().optional(),
  responsiblePerson: z.string().min(1, "Responsible person is required."),
  sla: z.coerce.number().int().positive("SLA must be a positive number."),
  steps: z.array(sopStepSchema).min(1, "At least one step is required."),
  attachments: z.array(z.instanceof(File)).optional(),
});

type SopFormValues = z.infer<typeof sopFormSchema>;

export default function CreateSopForm({ initialSopId }: { initialSopId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [dateCreated, setDateCreated] = useState("");
  const [uploadKey, setUploadKey] = useState(0);

  const { data: templates, error: templatesError } = useSWR<TemplateRecord[]>('/api/templates', fetcher);

  const form = useForm<SopFormValues>({
    resolver: zodResolver(sopFormSchema),
    defaultValues: {
      sopId: "",             // 👈 already resolved on the server
      title: "",
      description: "",
      responsiblePerson: user?.name || "",
      sla: 1,
      steps: [],
      attachments: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "steps",
  });

  const sopId = form.watch("sopId");
  const steps = form.watch("steps");

  // Only set date + user name locally
  useEffect(() => {
    setDateCreated(new Date().toLocaleDateString("en-CA"));
    if (user) form.setValue("responsiblePerson", user.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    async function fetchNextSopId() {
      try {
        const res = await fetch("/api/sop", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data?.nextSopId) {
          form.setValue("sopId", data.nextSopId); // 👈 This updates form state
        }
      } catch (e) {
        console.error("Failed to fetch next SOP ID", e);
      }
    }
  
    fetchNextSopId();
  }, []);

  const handleAppend = () => {
    append({
      stepOrder: fields.length + 1,
      title: "",
      detail: "",
      stepType: "Sequence",
      sla: 1,
      owner: "",
      reviewer: "",
      approver: "",
      nextStepYes: "",
      nextStepNo: "",
      attachments: [],
      templateId: undefined,
    });
  };

  const handleRemove = (index: number) => {
    remove(index);
    const currentSteps = form.getValues("steps");
    currentSteps.forEach((_, i) => {
      if (i >= index) form.setValue(`steps.${i}.stepOrder`, i + 1, { shouldDirty: true });
    });
  };

  // Submit — server assigns the real sopId atomically
  async function onSubmit(data: SopFormValues) {
    const { attachments, steps, ...rest } = data as any;
    const cleanSteps = (steps ?? []).map((s: any) => {
      const { attachments: _ignored, ...sRest } = s;
      return sRest;
    });
    const payload = { ...rest, steps: cleanSteps };

    try {
      const res = await fetch("/api/sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.error || "Request failed");

      toast({
        title: "Success!",
        description: "SOP created successfully.",
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      });

      // Fetch next preview id for a new, clean form
      let nextId = "sop-???";
      try {
        const r = await fetch("/api/sop", { cache: "no-store" });
        const d = await r.json();
        if (r.ok && d?.nextSopId) nextId = d.nextSopId;
      } catch {}

      form.reset({
        sopId: nextId,
        title: "",
        description: "",
        department: undefined,          // <-- make Select go back to placeholder
        cluster: "",
        group: "",
        section: "",
        responsiblePerson: user?.name || "",
        sla: 1,
        steps: [],                      // <-- removes all step cards
        attachments: [],                // <-- clears top-level attachments value
      } as Partial<SopFormValues>);
      
      setUploadKey((k) => k + 1);        // <-- force FileUpload to re-mount (clears UI
      setDateCreated(new Date().toLocaleDateString("en-CA"));

      // router.push('/sops') // optional
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({ title: "Error", description: String(error?.message || error), variant: "destructive" });
    }
  }

  return (
    <MainLayout>
      <div className="space-y-4 mb-8">
        <Link href="/sops" className="text-sm text-primary hover:underline">
          &larr; Back to SOPs Management
        </Link>
        <h1 className="text-4xl font-bold text-primary">Create New SOP</h1>
        <p className="text-lg text-muted-foreground">
          Fill out the form below to create a new Standard Operating Procedure.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>SOP Details</CardTitle>
              <CardDescription>Provide the main information for the SOP.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sopId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SOP ID</FormLabel>
                      <FormControl>
                        <Input placeholder="sop-???" {...field} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SOP Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., New Employee Onboarding" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sopDepartments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cluster"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cluster</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter cluster" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="group"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group (กลุ่ม)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter group" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section (ส่วนงาน)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter section" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <FormItem>
                  <FormLabel>Date Created</FormLabel>
                  <FormControl>
                    <Input value={dateCreated} readOnly />
                  </FormControl>
                </FormItem>
                <FormField
                  control={form.control}
                  name="responsiblePerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsible Person (ผู้รับผิดชอบ)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sla"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standard Time (มาตราฐานเวลา)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the purpose and scope of this SOP..."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Attachment (Optional)</FormLabel>
                    <FormControl>
                      <FileUpload key={uploadKey} value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>Upload any relevant documents, templates, or diagrams.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>SOP Steps</CardTitle>
                <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  {sopId}
                </span>
              </div>
              <CardDescription>Define the individual steps of the procedure. You can reorder them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg relative space-y-4 bg-background/50">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-lg text-primary">Step {field.stepOrder}</h4>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <FormField
                    control={form.control}
                    name={`steps.${index}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Step Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Send Welcome Kit" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`steps.${index}.detail`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Step Detail</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the action to be taken in this step." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`steps.${index}.stepType`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Step Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select step type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Sequence">Sequence</SelectItem>
                              <SelectItem value="Decision">Decision</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`steps.${index}.templateId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Template (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a template" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Template</SelectItem>
                              {templates?.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                           {templatesError && <FormMessage>Could not load templates.</FormMessage>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {steps[index]?.stepType === "Decision" && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`steps.${index}.nextStepYes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Next step (Yes)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`steps.${index}.nextStepNo`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Next step (No)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 3" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`steps.${index}.sla`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SLA (days)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`steps.${index}.owner`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner</FormLabel>
                            <FormControl>
                              <Input placeholder="owner@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`steps.${index}.reviewer`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reviewer</FormLabel>
                            <FormControl>
                              <Input placeholder="reviewer@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`steps.${index}.approver`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Approver</FormLabel>
                            <FormControl>
                              <Input placeholder="approver@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name={`steps.${index}.attachments`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>File Attachment (Optional)</FormLabel>
                        <FormControl>
                        <FileUpload key={uploadKey} value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}

              <Button type="button" variant="outline" onClick={handleAppend} className="gap-2">
                <PlusCircle className="w-4 h-4" /> Add New Step
              </Button>

              {form.formState.errors.steps && (
                <p className="text-sm font-medium text-destructive">
                  {typeof form.formState.errors.steps === "string"
                    ? (form.formState.errors.steps as any)
                    : (form.formState.errors.steps as any).message}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating..." : "Create SOP"}
          </Button>
          </div>
        </form>
      </Form>
    </MainLayout>
  );
}
