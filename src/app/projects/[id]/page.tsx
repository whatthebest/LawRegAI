
"use client";

import { useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { SopTimeline } from '@/components/SopTimeline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { mockSops } from '@/lib/mockData';
import { Edit, Plus, Trash2, User, Clock, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';

const mockProjects = [
    { id: "q3-marketing-campaign", name: "Q3 Marketing Campaign", description: "Launch campaign for the new product line.", status: "In Progress", sop: "sop-004" },
    { id: "website-redesign", name: "Website Redesign", description: "Complete overhaul of the corporate website.", status: "Planning", sop: "sop-002" },
    { id: "new-hire-batch-onboarding", name: "New Hire Batch Onboarding", description: "Onboard the new batch of engineers.", status: "Completed", sop: "sop-001" },
];

interface Task {
  id: string;
  name: string;
  detail: string;
  sla: number;
  owner: string;
  manager: string;
  completed: boolean;
}

type TaskFormValues = Omit<Task, 'id' | 'completed'>;

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const project = mockProjects.find(p => p.id === projectId);
  const sop = mockSops.find(s => s.id === project?.sop);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskFormValues>();

  if (!project || !sop) {
    notFound();
  }

  const handleAddTask = (data: TaskFormValues) => {
    setTasks([...tasks, { ...data, id: `task-${Date.now()}`, completed: false }]);
    reset();
    setIsDialogOpen(false);
  };
  
  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };
  
  const removeTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };


  return (
    <MainLayout>
      <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
        <div className="space-y-2 max-w-4xl">
          <Link href="/tasks" className="text-sm text-primary hover:underline">
            &larr; Back to Work Tracker
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold text-primary">{project.name}</h1>
          </div>
          <p className="text-lg text-muted-foreground">{project.description}</p>
        </div>
        <Button variant="outline" className="gap-2">
            <Edit className="w-4 h-4" />
            Edit Project
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Project To-Do List</CardTitle>
                    <CardDescription>Track tasks specific to this project.</CardDescription>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> Add Task
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add a new task</DialogTitle>
                            <DialogDescription>Fill in the details for the new project task.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(handleAddTask)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Task Name</Label>
                                <Input id="name" {...register("name", { required: "Task name is required." })} />
                                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="detail">Detail</Label>
                                <Textarea id="detail" {...register("detail", { required: "Detail is required." })} />
                                {errors.detail && <p className="text-destructive text-sm">{errors.detail.message}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sla">SLA (days)</Label>
                                    <Input id="sla" type="number" {...register("sla", { required: "SLA is required.", valueAsNumber: true })} />
                                    {errors.sla && <p className="text-destructive text-sm">{errors.sla.message}</p>}
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="owner">Owner</Label>
                                    <Input id="owner" {...register("owner", { required: "Owner is required." })} />
                                    {errors.owner && <p className="text-destructive text-sm">{errors.owner.message}</p>}
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="manager">Manager</Label>
                                <Input id="manager" {...register("manager", { required: "Manager is required." })} />
                                {errors.manager && <p className="text-destructive text-sm">{errors.manager.message}</p>}
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                               <DialogClose asChild>
                                    <Button type="button" variant="ghost">Cancel</Button>
                                </DialogClose>
                                <Button type="submit">Add Task</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-4">
                    {tasks.length > 0 ? tasks.map(task => (
                        <Card key={task.id} className={`p-4 ${task.completed ? 'bg-muted/50' : ''}`}>
                            <div className="flex items-start gap-4">
                                <Checkbox 
                                    id={`task-${task.id}`} 
                                    checked={task.completed} 
                                    onCheckedChange={() => toggleTask(task.id)}
                                    className="mt-1"
                                />
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor={`task-${task.id}`} className={`text-lg font-semibold ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                        {task.name}
                                    </Label>
                                    <p className={`text-sm text-muted-foreground ${task.completed ? 'line-through' : ''}`}>{task.detail}</p>
                                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs pt-2">
                                        <div className="flex items-center gap-1.5"><Clock className="w-3 h-3"/> SLA: {task.sla} days</div>
                                        <div className="flex items-center gap-1.5"><User className="w-3 h-3"/> Owner: {task.owner}</div>
                                        <div className="flex items-center gap-1.5"><Shield className="w-3 h-3"/> Manager: {task.manager}</div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => removeTask(task.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        </Card>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No tasks added yet. Click "Add Task" to get started.</p>
                    )}
                </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6 md:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>SOP Guideline</CardTitle>
              <CardDescription>{sop.title}</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              <SopTimeline steps={sop.steps} />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
