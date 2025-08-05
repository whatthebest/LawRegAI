export interface User {
  name: string;
  email: string;
  department: string;
}

export type SOPStatus = 'Draft' | 'In Review' | 'Approved' | 'Archived';
export type SOPStepStatus = 'Draft' | 'Review' | 'Approved';
export type SOPDepartment = 'Operations' | 'Engineering' | 'HR' | 'Marketing';
export type SOPStepType = 'Sequence' | 'Decision';


export interface SOPStep {
  id: string;
  stepOrder: number;
  title: string;
  detail: string;
  stepType: SOPStepType;
  nextStepYes?: string;
  nextStepNo?: string;
  sla: number; // in days
  owner: string; // user email
  reviewer: string;
  approver: string;
  status: SOPStepStatus;
}

export interface SOP {
  id: string;
  title: string;
  description: string;
  department: SOPDepartment;
  cluster?: string;
  group?: string;
  section?: string;
  responsiblePerson: string; // user email
  sla: number; // in days
  createdAt: string; // ISO date string
  status: SOPStatus;
  steps: SOPStep[];
}
