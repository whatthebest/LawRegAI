
"use client";

import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { mockSops } from '@/lib/mockData';
import { SOP, SOPStep } from '@/lib/types';
import { Check, Clock, PlusCircle, FolderKanban, Briefcase } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SopTimeline } from '@/components/SopTimeline';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Task extends SOPStep {
  sopTitle: string;
  sopId: string;
}

// Mock project data for the new tab
const mockProjects = [
    { name: "Q3 Marketing Campaign", description: "Launch campaign for the new product line.", status: "In Progress", sop: "sop-004" },
    { name: "Website Redesign", description: "Complete overhaul of the corporate website.", status: "Planning", sop: "sop-002" },
    { name: "New Hire Batch Onboarding", description: "Onboard the new batch of engineers.", status: "Completed", sop: "sop-001" },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [isCreateWorkOpen, setCreateWorkOpen] = useState(false);
  const [selectedSop, setSelectedSop] = useState<SOP | null>(null);

  const tasks = useMemo(() => {
    if (!user) return [];
    const allTasks: Task[] = [];
    mockSops.forEach(sop => {
      sop.steps.forEach(step => {
        if (step.owner === user.email || step.reviewer === user.email || step.approver === user.email) {
          allTasks.push({ ...step, sopTitle: sop.title, sopId: sop.id });
        }
      });
    });
    return allTasks;
  }, [user]);

  const toReviewTasks = tasks.filter(task => task.reviewer === user?.email && task.status === 'Review');
  const toApproveTasks = tasks.filter(task => task.approver === user?.email && task.status === 'Review');
  const completedTasks = tasks.filter(task => (task.owner === user?.email || task.reviewer === user?.email || task.approver === user?.email) && task.status === 'Approved');

  const handleSopSelect = (sopId: string) => {
    const sop = mockSops.find(s => s.id === sopId);
    setSelectedSop(sop || null);
  };

  const TaskList = ({ tasks, emptyMessage }: { tasks: Task[], emptyMessage: string }) => {
    if (tasks.length === 0) {
        return <p className="text-muted-foreground text-center py-8">{emptyMessage}</p>
    }
    return (
        <div className="space-y-4">
            {tasks.map(task => (
                <Card key={`${task.id}-${task.sopId}`} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className='max-w-prose'>
                            <p className="text-sm text-muted-foreground">SOP: {task.sopTitle}</p>
                            <p className="font-semibold">Step {task.stepOrder}: {task.title}</p>
                            <p className="text-sm text-muted-foreground">Status: {task.status}</p>
                        </div>
                         <Link href={`/sops/${task.sopId}`} passHref>
                            <Button variant="outline">View SOP</Button>
                         </Link>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
  }

  return (
    <MainLayout>
      <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
        <div className="space-y-2">
            <h1 className="text-4xl font-bold text-primary">Work Tracker</h1>
            <p className="text-lg text-muted-foreground">Create and manage your projects, and track your assigned SOP tasks.</p>
        </div>
        <Dialog open={isCreateWorkOpen} onOpenChange={setCreateWorkOpen}>
          <DialogTrigger asChild>
            <Button className='gap-2'><PlusCircle className='w-4 h-4'/> Create Work</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Work Item</DialogTitle>
              <DialogDescription>
                Define a new work item and link it to an existing SOP for guidance.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="work-name" className="text-right">Work Name</Label>
                <Input id="work-name" placeholder="e.g., Q3 Marketing Campaign" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="work-detail" className="text-right">Work Detail</Label>
                <Textarea id="work-detail" placeholder="Describe the goals and context of this work." className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sop-select" className="text-right">Relevant SOP</Label>
                 <Select onValueChange={handleSopSelect}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a relevant SOP" />
                    </SelectTrigger>
                    <SelectContent>
                        {mockSops.map(sop => (
                            <SelectItem key={sop.id} value={sop.id}>
                                {sop.title} ({sop.id})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
            </div>
            {selectedSop && (
                <div className="space-y-4">
                    <Separator/>
                    <h4 className="font-semibold text-lg">SOP Guideline: {selectedSop.title}</h4>
                    <div className="max-h-[300px] overflow-y-auto p-1 pr-4">
                        <SopTimeline steps={selectedSop.steps} />
                    </div>
                </div>
            )}
            <div className="flex justify-end pt-4">
                <Button onClick={() => setCreateWorkOpen(false)}>Save Work Item</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projects" className="gap-2"><FolderKanban className="w-4 h-4"/> Project List</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2"><Briefcase className="w-4 h-4" /> My Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="projects">
            <Card>
                <CardHeader>
                    <CardTitle>Project List</CardTitle>
                    <CardDescription>All the work items and projects you have created.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mockProjects.map((project, index) => (
                        <Card key={index}>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center text-xl">
                                    {project.name}
                                    <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'}>{project.status}</Badge>
                                </CardTitle>
                                <CardDescription>Relevant SOP: {mockSops.find(s => s.id === project.sop)?.title}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{project.description}</p>
                                <Button variant="link" className="px-0 pt-4">View Project Details &rarr;</Button>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="tasks">
            <Tabs defaultValue="review" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="review" className="gap-2">
                    <Clock className='w-4 h-4' /> To Review ({toReviewTasks.length})
                </TabsTrigger>
                <TabsTrigger value="approve" className="gap-2">
                    <Check className='w-4 h-4' /> To Approve ({toApproveTasks.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                    <Check className='w-4 h-4' /> Completed ({completedTasks.length})
                </TabsTrigger>
                </TabsList>
                <TabsContent value="review">
                    <TaskList tasks={toReviewTasks} emptyMessage="You have no steps to review." />
                </TabsContent>
                <TabsContent value="approve">
                    <TaskList tasks={toApproveTasks} emptyMessage="You have no steps to approve." />
                </TabsContent>
                <TabsContent value="completed">
                    <TaskList tasks={completedTasks} emptyMessage="You have not completed any steps yet." />
                </TabsContent>
            </Tabs>
        </TabsContent>
      </Tabs>
    </MainLayout>
  )
}
    
