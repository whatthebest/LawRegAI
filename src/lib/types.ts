export interface User {
  name: string;
  email: string;
  department: string;
}

export type SOPStatus = 'Draft' | 'In Review' | 'Approved' | 'Archived';
export type SOPStepStatus = 'Draft' | 'Review' | 'Approved';
export type SOPDepartment = 'Operations' | 'Engineering' | 'HR' | 'Marketing';

export interface SOPStep {
  id: string;
  title: string;
  detail: string;
  sla: number; // in days
  owner: string; // user email
  status: SOPStepStatus;
}

export interface SOP {
  id: string;
  title: string;
  description: string;
  department: SOPDepartment;
  responsiblePerson: string; // user email
  sla: number; // in days
  createdAt: string; // ISO date string
  status: SOPStatus;
  steps: SOPStep[];
}
