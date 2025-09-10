export type SystemRole = "RegTechTeam" | "Manager" | "User";


export interface User {
  name: string;
  email: string;
  department: string;
  systemRole?: string; 
}

// ----- SOP Definitions -----

export type SOPStatus = 'Draft' | 'In Review' | 'Approved' | 'Archived';
export type SOPDepartment = 'Operations' | 'Engineering' | 'HR' | 'Marketing' | 'Customer Support' | 'IT';

export interface SOP {
  id: string; // The unique ID for the object (e.g., sop-001)
  sopId: string; // The human-readable ID (e.g., SOP-001)
  title: string;
  description: string;
  department: SOPDepartment;
  cluster?: string;
  group?: string;
  section?: string;
  responsiblePerson: string; // Corresponds to the form field for submission
  owner: string; // The official owner, for display
  version: string;
  sla: number; // in days
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  status: SOPStatus;
  attachments: any[]; // Using 'any' for simplicity with FileUpload component
  steps: SOPStep[];
}

// ----- SOP Step Definitions -----

export type SOPStepStatus = 'Pending' | 'In Progress' | 'Review' | 'Approved' | 'Rejected';
export type SOPStepType = 'Sequence' | 'Decision';

export interface SOPStep {
  id: string;
  stepOrder: number;
  title: string;
  detail: string;
  stepType: SOPStepType;
  nextStepYes?: string; // Optional, for Decision steps
  nextStepNo?: string;  // Optional, for Decision steps
  sla: number; // in days
  owner: string; // user email
  reviewer: string;
  approver: string;
  status: SOPStepStatus; // Display status for the step
  attachments: any[];
}

// ----- Project Definitions (Restored) -----

export type ProjectStatus = 'Planning' | 'In Progress' | 'Completed';

export interface Project {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    sop: string; // Corresponds to an SOP ID
}

// ----- Document Template Definitions -----
export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  content: string; // The actual template body, can contain placeholders like {{variable}}
  createdAt: string; // ISO date string
}
