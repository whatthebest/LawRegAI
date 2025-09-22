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
  id: string;
  sopId: string;
  title: string;
  description: string;
  department: SOPDepartment;
  cluster?: string;
  group?: string;
  section?: string;

  // These two are sometimes missing at creation → make optional
  responsiblePerson?: string;          // ← was required
  owner?: string;                      // keep optional if not always set

  // Optional submitter for Manager Review tab fallback
  submittedBy?: string;                // ← ADD THIS

  version: string;
  sla: number;                         // days

  createdAt: string;                   // ISO
  updatedAt?: string;                  // ← make optional; PATCH will set it

  status: SOPStatus;
  attachments: any[];
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
export type TemplateFieldType = "Text" | "Number" | "Checklist" | "Person";

export interface TemplateField {
  name: string; // a unique machine-readable name, e.g., "project_name"
  label: string; // a human-readable label, e.g., "Project Name"
  type: TemplateFieldType;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  fields: TemplateField[];
  createdAt: string; // ISO date string
}
