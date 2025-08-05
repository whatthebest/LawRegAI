
"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { sopDepartments, sopStepStatuses } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const sopStepSchema = z.object({
  title: z.string().min(3, "Step title must be at least 3 characters."),
  detail: z.string().min(10, "Step detail must be at least 10 characters."),
  sla: z.coerce.number().int().positive("SLA must be a positive number."),
  owner: z.string().email("Owner must be a valid email."),
  status: z.enum(["Draft", "Review", "Approved"]),
});

const sopFormSchema = z.object({
  title: z.string().min(5, "SOP title must be at least 5 characters."),
  description: z.string().min(20, "Description must be at least 20 characters."),
  department: z.enum(["Operations", "Engineering", "HR", "Marketing"]),
  cluster: z.string().optional(),
  group: z.string().optional(),
  section: z.string().optional(),
  responsiblePerson: z.string().min(1, "Responsible person is required."),
  sla: z.coerce.number().int().positive("SLA must be a positive number."),
  steps: z.array(sopStepSchema).min(1, "At least one step is required."),
});

type SopFormValues = z.infer<typeof sopFormSchema>;

export default function CreateSopPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [dateCreated, setDateCreated] = useState('');

  useEffect(() => {
    setDateCreated(new Date().toLocaleDateString('en-CA'));
    if (user) {
      form.setValue('responsiblePerson', user.name);
    }
  }, [user]);

  const form = useForm<SopFormValues>({
    resolver: zodResolver(sopFormSchema),
    defaultValues: {
      title: "",
      description: "",
      responsiblePerson: user?.name || '',
      sla: 1,
      steps: [],
    },
  });

  const { fields, append, remove, swap } = useFieldArray({
    control: form.control,
    name: "steps",
  });

  function onSubmit(data: SopFormValues) {
    console.log(data);
    toast({
      title: "SOP Created Successfully!",
      description: `The SOP "${data.title}" has been saved as a draft.`,
      className: "bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-600",
    });
    router.push("/sops");
  }

  return (
    <MainLayout>
      <div className="space-y-4 mb-8">
        <h1 className="text-4xl font-bold text-primary">Create New SOP</h1>
        <p className="text-lg text-muted-foreground">Fill out the form below to create a new Standard Operating Procedure.</p>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <FormItem>
                  <FormLabel>Date Created</FormLabel>
                  <FormControl><Input value={dateCreated} disabled /></FormControl>
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
              <FormItem>
                <FormLabel>File Attachment (Optional)</FormLabel>
                <FormControl><Input type="file" /></FormControl>
                <FormDescription>Upload any relevant documents, templates, or diagrams.</FormDescription>
              </FormItem>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SOP Steps</CardTitle>
              <CardDescription>Define the individual steps of the procedure. You can reorder them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg relative space-y-4 bg-background/50">
                   <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-lg text-primary">Step {index + 1}</h4>
                     <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => swap(index, index - 1)}><ArrowUp className="w-4 h-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" disabled={index === fields.length - 1} onClick={() => swap(index, index + 1)}><ArrowDown className="w-4 h-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <Separator />
                  <FormField control={form.control} name={`steps.${index}.title`} render={({ field }) => (
                    <FormItem><FormLabel>Step Title</FormLabel><FormControl><Input placeholder="e.g., Send Welcome Kit" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`steps.${index}.detail`} render={({ field }) => (
                    <FormItem><FormLabel>Step Detail</FormLabel><FormControl><Textarea placeholder="Describe the action to be taken in this step." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid sm:grid-cols-3 gap-4">
                     <FormField control={form.control} name={`steps.${index}.sla`} render={({ field }) => (
                      <FormItem><FormLabel>SLA (days)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name={`steps.${index}.owner`} render={({ field }) => (
                      <FormItem><FormLabel>Owner</FormLabel><FormControl><Input placeholder="owner@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`steps.${index}.status`} render={({ field }) => (
                      <FormItem><FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {sopStepStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => append({ title: '', detail: '', sla: 1, owner: '', status: 'Draft' })} className="gap-2">
                <PlusCircle className="w-4 h-4" /> Add New Step
              </Button>
               {form.formState.errors.steps && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.steps.message}</p>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button type="submit" size="lg">Create SOP</Button>
          </div>
        </form>
      </Form>
    </MainLayout>
  );
}
