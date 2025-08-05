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
import { ArrowRight, Search, FilePlus2 } from 'lucide-react';
import { mockSops, sopDepartments, sopStatuses } from '@/lib/mockData';
import type { SOP, SOPDepartment, SOPStatus } from '@/lib/types';
import { format } from 'date-fns';

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

  const filteredSops = useMemo(() => {
    return sops
      .filter(sop => departmentFilter === 'all' || sop.department === departmentFilter)
      .filter(sop => statusFilter === 'all' || sop.status === statusFilter)
      .filter(sop => sop.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [sops, departmentFilter, statusFilter, searchTerm]);

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
    </MainLayout>
  );
}
