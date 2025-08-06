
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search, FilePlus2, Check, X } from 'lucide-react';
import { mockSops, sopDepartments, sopStatuses } from '@/lib/mockData';
import type { SOP, SOPDepartment, SOPStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SopTimeline } from '@/components/SopTimeline';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const getStatusVariant = (status: SOPStatus) => {
  switch (status) {
    case 'Approved': return 'default';
    case 'In Review': return 'secondary';
    case 'Draft': return 'outline';
    case 'Archived': return 'destructive';
    default: return 'outline';
  }
};

export default function SopsListPage() {
  const [sops, setSops] = useState<SOP[]>(mockSops);
  const [departmentFilter, setDepartmentFilter] = useState<SOPDepartment | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SOPStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();


  const filteredSops = useMemo(() => {
    return sops
      .filter(sop => departmentFilter === 'all' || sop.department === departmentFilter)
      .filter(sop => statusFilter === 'all' || sop.status === statusFilter)
      .filter(sop => sop.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [sops, departmentFilter, statusFilter, searchTerm]);

  const handleApproval = (sopId: string, newStatus: 'Approved' | 'Draft') => {
    const action = newStatus === 'Approved' ? 'approved' : 'rejected';
    setSops(prevSops => prevSops.map(sop => sop.id === sopId ? { ...sop, status: newStatus } : sop));
    toast({
      title: `SOP ${action}`,
      description: `The SOP has been successfully ${action}.`,
    });
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
        <div className="space-y-2">
            <h1 className="text-4xl font-bold text-primary">SOP Repository</h1>
            <p className="text-lg text-muted-foreground">Browse, search, and manage all procedures.</p>
        </div>
        <Link href="/create-sop" passHref>
          <Button className='gap-2'><FilePlus2 className='w-4 h-4'/> Create New SOP</Button>
        </Link>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="list">List of SOPs</TabsTrigger>
          <TabsTrigger value="manager">Manager SOPs</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
            <Card>
                <CardHeader>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="relative flex-1 md:grow-0">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by SOP title..."
                            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                    <Select value={departmentFilter} onValueChange={(value) => setDepartmentFilter(value as SOPDepartment | 'all')}>
                        <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Department" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {sopDepartments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SOPStatus | 'all')}>
                        <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {sopStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    </div>
                </div>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>SOP Title</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredSops.length > 0 ? (
                        filteredSops.map(sop => (
                        <TableRow key={sop.id}>
                            <TableCell className="font-medium">{sop.title}</TableCell>
                            <TableCell>{sop.department}</TableCell>
                            <TableCell>{format(new Date(sop.createdAt), 'MMMM d, yyyy')}</TableCell>
                            <TableCell>
                            <Badge variant={getStatusVariant(sop.status)}>{sop.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                            <Link href={`/sops/${sop.id}`} passHref>
                                <Button variant="ghost" size="sm" className='gap-1'>
                                View
                                <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                            No SOPs found.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="manager">
            <Card>
                <CardHeader>
                    <CardTitle>Manager Review</CardTitle>
                    <CardDescription>Review, approve, or reject SOPs that are pending action.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full space-y-4">
                        {sops.filter(sop => sop.status === 'In Review').map(sop => (
                            <AccordionItem value={sop.id} key={sop.id} className="border-b-0">
                                <Card className="shadow-md">
                                    <AccordionTrigger className="p-6 text-left hover:no-underline">
                                        <div className="flex justify-between w-full items-center">
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-lg text-primary">{sop.title}</h3>
                                                <p className="text-sm text-muted-foreground">{sop.department} &bull; Submitted by {sop.responsiblePerson}</p>
                                            </div>
                                            <div className='flex items-center gap-4'>
                                                <Badge variant={getStatusVariant(sop.status)}>{sop.status}</Badge>
                                                <span className="text-sm text-muted-foreground">{format(new Date(sop.createdAt), 'MMM d, yyyy')}</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-6 pb-6">
                                        <Separator className="mb-4" />
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="font-semibold mb-2">Description</h4>
                                                <p className="text-muted-foreground">{sop.description}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-2">SOP Timeline & Steps</h4>
                                                <SopTimeline steps={sop.steps} />
                                            </div>
                                            <Separator />
                                            <div className="space-y-4">
                                                <h4 className="font-semibold">Manager Action</h4>
                                                <Textarea placeholder="Add comments for the creator (optional)..." />
                                                <div className="flex gap-4">
                                                    <Button onClick={() => handleApproval(sop.id, 'Approved')} className="gap-2 bg-green-600 hover:bg-green-700">
                                                        <Check className="w-4 h-4" /> Approve
                                                    </Button>
                                                    <Button onClick={() => handleApproval(sop.id, 'Draft')} variant="destructive" className="gap-2">
                                                        <X className="w-4 h-4" /> Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        ))}
                    </Accordion>
                     {sops.filter(sop => sop.status === 'In Review').length === 0 && (
                        <p className="text-center text-muted-foreground py-12">There are no SOPs awaiting review.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
