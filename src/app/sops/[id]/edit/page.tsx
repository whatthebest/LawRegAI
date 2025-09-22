
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
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState} from "react";
import Link from "next/link";
import { FileUpload } from "@/components/FileUpload";
import useSWR from "swr";
import type { SOP } from "@/lib/types";


const sopStepSchema = z.object({
  id: z.string(),
  stepOrder: z.number(),
  title: z.string().min(3, "Step title must be at least 3 characters."),
  detail: z.string().min(10, "Step detail must be at least 10 characters."),
  stepType: z.enum(['Sequence', 'Decision']),
  nextStepYes: z.string().optional(),
  nextStepNo: z.string().optional(),
  sla: z.coerce.number().int().positive("SLA must be a positive number."),
  owner: z.string().email("Owner must be a valid email."),
  reviewer: z.string().email("Reviewer must be a valid email."),
  approver: z.string().email("Approver must be a valid email."),
  status: z.enum(['Draft', 'Review', 'Approved', 'Pending', 'In Progress', 'Rejected']),
  attachments: z.array(z.instanceof(File)).optional(),
});

const sopFormSchema = z.object({
  sopId: z.string(),
  title: z.string().min(5, "SOP title must be at least 5 characters."),
  description: z.string().min(20, "Description must be at least 20 characters."),
  department: z.enum(["Operations", "Engineering", "HR", "Marketing", "Customer Support", "IT"]),
  cluster: z.string().optional(),
  group: z.string().optional(),
  section: z.string().optional(),
  responsiblePerson: z.string().min(1, "Responsible person is required."),
  sla: z.coerce.number().int().positive("SLA must be a positive number."),
  steps: z.array(sopStepSchema).min(1, "At least one step is required."),
  attachments: z.array(z.instanceof(File)).optional(),
});

type SopFormValues = z.infer<typeof sopFormSchema>;

const stepStatusOptions: ReadonlyArray<SopFormValues["steps"][number]["status"]> = [
  "Draft",
  "Review",
  "Approved",
  "Pending",
  "In Progress",
  "Rejected",
] as const;

const fetchSop = async (url: string): Promise<SOP | null> => {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load SOP: ${response.status}`);
  }
  return (await response.json()) as SOP;
};

export default function EditSopPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const sopIdToEdit = params.id as string;
  
  const { data: sopData, error, isLoading } = useSWR<SOP | null>(
    sopIdToEdit ? `/api/sops/${encodeURIComponent(sopIdToEdit)}` : null,
    fetchSop,
    { revalidateOnFocus: false }
  );

  const [dateCreated, setDateCreated] = useState("");
  const lastLoadedSopRef = useRef<string | null>(null);

  const form = useForm<SopFormValues>({
    resolver: zodResolver(sopFormSchema),
    defaultValues: {
      sopId: '',
      title: "",
      description: "",
      responsiblePerson: user?.name || '',
      sla: 1,
      steps: [],
      attachments: [],
    },
  });


  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "steps",
  });

  const sopId = form.watch("sopId");
  const steps = form.watch("steps");

  useEffect(() => {
    if (!sopData) {
      return;
    }

    const normalizedId = sopData?.id ?? sopData?.sopId ?? sopIdToEdit ?? "";
    if (lastLoadedSopRef.current === normalizedId) {
      return;
    }

    const departmentValue = (
      sopDepartments.includes(sopData.department)
        ? sopData.department
        : sopDepartments[0] ?? "Operations"
    ) as SopFormValues["department"];

    form.reset({
      sopId: sopData.sopId ?? sopData.id ?? sopIdToEdit ?? "",
      title: sopData.title ?? "",
      description: sopData.description ?? "",
      department: departmentValue,
      cluster: sopData.cluster ?? "",
      group: sopData.group ?? "",
      section: sopData.section ?? "",
      responsiblePerson: sopData.responsiblePerson ?? sopData.owner ?? user?.name ?? "",
      sla:
        typeof sopData.sla === "number" && !Number.isNaN(sopData.sla)
          ? sopData.sla
          : Number(sopData.sla) || 1,
      attachments: [],
      steps: [],
    });

    const formattedSteps: SopFormValues["steps"] = (sopData.steps ?? []).map((step, index) => {
      const parsedStepOrder =
        typeof step.stepOrder === "number" && !Number.isNaN(step.stepOrder)
          ? step.stepOrder
          : Number(step.stepOrder) || index + 1;
      const parsedSla =
        typeof step.sla === "number" && !Number.isNaN(step.sla)
          ? step.sla
          : Number(step.sla) || 1;
      const nextYes =
        step.nextStepYes === undefined || step.nextStepYes === null
          ? ""
          : String(step.nextStepYes);
      const nextNo =
        step.nextStepNo === undefined || step.nextStepNo === null
          ? ""
          : String(step.nextStepNo);
      const statusValue =
        typeof step.status === "string" && stepStatusOptions.includes(step.status as any)
          ? (step.status as SopFormValues["steps"][number]["status"])
          : "Draft";

      return {
        id: step.id ?? `step-${index}`,
        stepOrder: parsedStepOrder,
        title: step.title ?? "",
        detail: step.detail ?? "",
        stepType: (step.stepType === "Decision" ? "Decision" : "Sequence") as SopFormValues["steps"][number]["stepType"],
        nextStepYes: nextYes,
        nextStepNo: nextNo,
        sla: parsedSla,
        owner: step.owner ?? "",
        reviewer: step.reviewer ?? "",
        approver: step.approver ?? "",
        status: statusValue,
        attachments: [] as File[],
      };
    });

    replace(formattedSteps);
    lastLoadedSopRef.current = normalizedId;
  }, [sopData, form, replace, sopIdToEdit, user?.name]);

  useEffect(() => {
    if (!sopData?.createdAt) {
      setDateCreated("");
      return;
    }
    const created = new Date(sopData.createdAt as any);
    setDateCreated(Number.isNaN(created.getTime()) ? "" : created.toLocaleDateString("en-CA"));
  }, [sopData?.createdAt]);

  const handleAppend = () => {
    append({ id: `new-step-${Date.now()}`, stepOrder: fields.length + 1, title: '', detail: '', stepType: 'Sequence', sla: 1, owner: '', reviewer: '', approver: '', status: 'Draft', nextStepYes: '', nextStepNo: '', attachments: [] });
  };

  const handleRemove = (index: number) => {
    remove(index);
    const currentSteps = form.getValues('steps');
    currentSteps.forEach((step, i) => {
        if (i >= index) {
            form.setValue(`steps.${i}.stepOrder`, i + 1, { shouldDirty: true });
        }
    });
  };

  function onSubmit(data: SopFormValues) {
    console.log(data);
    toast({
      title: "SOP Updated Successfully!",
      description: `The SOP "${data.title}" has been saved.`,
      className: "bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-600",
    });
    router.push(`/sops/${sopIdToEdit}`);
  }

  return (
    <MainLayout>
      {isLoading && <div className="py-8 text-muted-foreground">Loading SOP…</div>}
      {error && !isLoading && !sopData && (
        <div className="py-8 text-red-600">Failed to load SOP for editing.</div>
      )}
      {!sopData && !isLoading && !error && (
        <div className="max-w-2xl mx-auto mt-16">
          <Card className="shadow-sm">
            <CardHeader>
            <CardTitle>SOP not found</CardTitle>
            <CardDescription>We couldn’t find this SOP. It may have been removed or the URL is wrong.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/sops">&larr; Back to SOP Repository</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {sopData && (
        <>
          <div className="space-y-4 mb-8">
            <Link href={`/sops/${sopIdToEdit}`} className="text-sm text-primary hover:underline">
                &larr; Back to SOP Timeline
            </Link>
            <h1 className="text-4xl font-bold text-primary">Edit SOP</h1>
            <p className="text-lg text-muted-foreground">
                Update the details for this Standard Operating Procedure.
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
                 <FormField control={form.control} name="sopId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SOP ID</FormLabel>
                    <FormControl><Input {...field} readOnly /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SOP Title</FormLabel>
                    <FormControl><Input placeholder="e.g., New Employee Onboarding" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {sopDepartments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cluster" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cluster (กลุ่ม)</FormLabel>
                    <FormControl><Input placeholder="Enter cluster" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="group" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group (กลุ่ม)</FormLabel>
                    <FormControl><Input placeholder="Enter group" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="section" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section (ส่วนงาน)</FormLabel>
                    <FormControl><Input placeholder="Enter section" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <FormItem>
                  <FormLabel>Date Created</FormLabel>
                  <FormControl><Input value={dateCreated} readOnly /></FormControl>
                </FormItem>
                <FormField control={form.control} name="responsiblePerson" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsible Person (ผู้รับผิดชอบ)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sla" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standard Time (มาตราฐานเวลา)</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Describe the purpose and scope of this SOP..." {...field} rows={4} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Attachment (Optional)</FormLabel>
                    <FormControl>
                        <FileUpload
                            value={field.value}
                            onChange={field.onChange}
                        />
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
                <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">{sopId}</span>
              </div>
              <CardDescription>Define the individual steps of the procedure. You can reorder them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg relative space-y-4 bg-background/50">
                   <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-lg text-primary">Step {field.stepOrder}</h4>
                     <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <Separator />
                  <FormField control={form.control} name={`steps.${index}.title`} render={({ field }) => (
                    <FormItem><FormLabel>Step Title</FormLabel><FormControl><Input placeholder="e.g., Send Welcome Kit" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`steps.${index}.detail`} render={({ field }) => (
                    <FormItem><FormLabel>Step Detail</FormLabel><FormControl><Textarea placeholder="Describe the action to be taken in this step." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name={`steps.${index}.stepType`} render={({ field }) => (
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
                    )} />
                  {steps[index]?.stepType === 'Decision' && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`steps.${index}.nextStepYes`} render={({ field }) => (
                        <FormItem><FormLabel>Next step (Yes)</FormLabel><FormControl><Input type="number" placeholder="e.g., 2" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`steps.${index}.nextStepNo`} render={({ field }) => (
                        <FormItem><FormLabel>Next step (No)</FormLabel><FormControl><Input type="number" placeholder="e.g., 3" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`steps.${index}.sla`} render={({ field }) => (
                        <FormItem><FormLabel>SLA (days)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`steps.${index}.owner`} render={({ field }) => (
                        <FormItem><FormLabel>Owner</FormLabel><FormControl><Input placeholder="owner@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`steps.${index}.reviewer`} render={({ field }) => (
                        <FormItem><FormLabel>Reviewer</FormLabel><FormControl><Input placeholder="reviewer@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`steps.${index}.approver`} render={({ field }) => (
                        <FormItem><FormLabel>Approver</FormLabel><FormControl><Input placeholder="approver@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                   <FormField
                    control={form.control}
                    name={`steps.${index}.attachments`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>File Attachment (Optional)</FormLabel>
                        <FormControl>
                          <FileUpload
                            value={field.value}
                            onChange={field.onChange}
                          />
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
                <p className="text-sm font-medium text-destructive">{typeof form.formState.errors.steps === 'string' ? form.formState.errors.steps : form.formState.errors.steps.message}</p>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button type="submit" size="lg">Update SOP</Button>
          </div>
        </form>
      </Form>
      </>
      )}
    </MainLayout>
  );
}
