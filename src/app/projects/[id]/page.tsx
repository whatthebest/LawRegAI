
"use client";

import { useState, useEffect } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { SopTimeline } from '@/components/SopTimeline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mockSops, mockProjects } from '@/lib/mockData';
import { Edit, User, Clock, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SOPStep, SOPStepStatus } from '@/lib/types';

const getStatusBadgeVariant = (status: SOPStepStatus): VariantProps<typeof badgeVariants>["variant"] => {
    switch (status) {
        case 'Review': return 'warning';
        case 'Approved': return 'default';
        case 'Draft':
        default:
            return 'outline';
    }
};

const getStatusBadgeText = (status: SOPStepStatus): string => {
    switch (status) {
        case 'Review': return 'Pending Review';
        case 'Approved': return 'In Progress';
        case 'Draft': return 'Not Started';
        default:
            return 'Pending';
    }
};


interface ProjectFormValues {
    name: string;
    description: string;
    sop: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState(() => mockProjects.find(p => p.id === projectId));
  const [sop, setSop] = useState(() => mockSops.find(s => s.id === project?.sop));
  const [tasks, setTasks] = useState<SOPStep[]>([]);

  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  
  const { register: registerProject, handleSubmit: handleSubmitProject, reset: resetProject } = useForm<ProjectFormValues>();

  useEffect(() => {
    if (project) {
        resetProject({
            name: project.name,
            description: project.description,
            sop: project.sop,
        });
    }
    if (sop) {
      setTasks(sop.steps.map(step => ({...step, status: step.status || 'Draft'})));
    }
  }, [project, sop, resetProject]);

  if (!project || !sop) {
    notFound();
  }
  
  const handleStatusChange = (taskId: string, newStatus: SOPStepStatus) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };
  
  const handleEditProject = (data: ProjectFormValues) => {
    console.log("Updated project data:", data);
    const updatedProject = { ...project, ...data };
    const updatedSop = mockSops.find(s => s.id === data.sop);
    setProject(updatedProject);
    if(updatedSop) {
      setSop(updatedSop);
      setTasks(updatedSop.steps.map(step => ({...step, status: step.status || 'Draft'})));
    }
    setIsEditProjectOpen(false);
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
        <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                Edit Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Update the project details and linked SOP.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitProject(handleEditProject)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input id="projectName" {...registerProject("name", { required: "Project name is required" })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectDescription">Project Description</Label>
                <Textarea id="projectDescription" {...registerProject("description", { required: "Description is required" })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectSop">Relevant SOP</Label>
                <Select onValueChange={(value) => resetProject({...project, sop: value})} defaultValue={project.sop}>
                  <SelectTrigger id="projectSop">
                    <SelectValue placeholder="Select an SOP" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockSops.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Project To-Do List</CardTitle>
              <CardDescription>Tasks generated from the linked SOP: "{sop.title}"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-4">
                    {tasks.length > 0 ? tasks.map(task => (
                        <Card key={task.id} className="p-4 pt-10 relative">
                             <Badge variant={getStatusBadgeVariant(task.status)} className="absolute top-3 left-3">{getStatusBadgeText(task.status)}</Badge>
                            <div className="flex items-start gap-4">
                                <div className="flex-1 space-y-2 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Label className="text-lg font-semibold truncate cursor-pointer">
                                                        {task.title}
                                                    </Label>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{task.title}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                             <Select value={task.status} onValueChange={(value: SOPStepStatus) => handleStatusChange(task.id, value)}>
                                                <SelectTrigger className="w-[180px] h-8">
                                                    <SelectValue placeholder="Set status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Draft">Not Started</SelectItem>
                                                    <SelectItem value="Approved">In Progress</SelectItem>
                                                    <SelectItem value="Review">Ready to Review</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground break-words">{task.detail}</p>

                                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs pt-2">
                                        <div className="flex items-center gap-1.5"><Clock className="w-3 h-3"/> SLA: {task.sla} days</div>
                                        <div className="flex items-center gap-1.5"><User className="w-3 h-3"/> Owner: {task.owner}</div>
                                        <div className="flex items-center gap-1.5"><Shield className="w-3 h-3"/> Reviewer: {task.reviewer}</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-8">This SOP has no steps defined.</p>
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

