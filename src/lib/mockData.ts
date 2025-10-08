import { SOP, SOPDepartment, SOPStatus, SOPStep, SOPStepStatus, Project, DocumentTemplate } from './types';

// This mock data is structured to be consistent with the Zod schema in CreateSopForm.tsx
// It also includes fields needed for display purposes on the list and detail pages.

const mockSteps: SOPStep[] = [
  {
    id: 'step-1-1',
    stepOrder: 1,
    title: 'Send Welcome Kit',
    detail: 'HR coordinator sends the official welcome kit including company swag, an employment contract, and necessary HR forms to the new employee\'s home address.',
    stepType: 'Sequence',
    nextStepYes: '',
    nextStepNo: '',
    sla: 1,
    owner: 'hr@company.com',
    reviewer: 'hr-manager@company.com',
    approver: 'hr-director@company.com',
    status: 'Approved', // Display-only status
    attachments: [],
  },
  {
    id: 'step-1-2',
    stepOrder: 2,
    title: 'Setup IT Equipment & Accounts',
    detail: 'The IT department provisions a new laptop, creates necessary system accounts (Email, HRIS, etc.), and ensures all software is installed.',
    stepType: 'Sequence',
    nextStepYes: '',
    nextStepNo: '',
    sla: 2,
    owner: 'it@company.com',
    reviewer: 'it-manager@company.com',
    approver: 'it-director@company.com',
    status: 'Approved',
    attachments: [],
  },
  {
    id: 'step-1-3',
    stepOrder: 3,
    title: 'Department Introduction',
    detail: 'The hiring manager schedules and leads a team meeting to introduce the new employee, outline their role, and facilitate initial connections.',
    stepType: 'Sequence',
    nextStepYes: '',
    nextStepNo: '',
    sla: 1,
    owner: 'jane@company.com',
    reviewer: 'dept-head@company.com',
    approver: 'dept-head@company.com',
    status: 'Approved',
    attachments: [],
  },
];

export const mockSops: SOP[] = [
  {
    id: 'sop-001',
    sopId: 'SOP-001',
    title: 'New Employee Onboarding',
    description: 'This SOP outlines the standardized procedure for onboarding new hires to ensure a smooth, welcoming, and effective integration into the company culture and their specific role.',
    department: 'HR',
    cluster: 'People Ops',
    group: 'Onboarding',
    section: 'Global',
    responsiblePerson: 'hr-manager@company.com', // Corresponds to form field
    owner: 'hr-manager@company.com', // For details page display
    sla: 5,
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-02T11:00:00Z',
    status: 'Approved',
    version: '1.1',
    attachments: [],
    steps: mockSteps,
  },
  {
    id: 'sop-002',
    sopId: 'SOP-002',
    title: 'Deploy to Production',
    description: 'The official process for deploying new code from the staging environment to the live production environment, including pre-flight checks, sign-offs, and rollback procedures.',
    department: 'Engineering',
    cluster: 'Core Platform',
    group: 'DevOps',
    section: 'Release Management',
    responsiblePerson: 'tech-lead@company.com',
    owner: 'devops-lead@company.com',
    sla: 1,
    createdAt: '2023-11-15T14:30:00Z',
    updatedAt: '2023-11-16T15:00:00Z',
    status: 'In Review',
    version: '2.0',
    attachments: [],
    steps: [
      { id: 'step-2-1', stepOrder: 1, title: 'Run Final QA Tests', detail: 'QA team runs final regression and smoke tests on the staging environment to ensure stability.', stepType: 'Sequence', nextStepYes: '', nextStepNo: '', sla: 1, owner: 'qa@company.com', reviewer: 'qa-lead@company.com', approver: 'tech-lead@company.com', status: 'Approved', attachments: [] },
      { id: 'step-2-2', stepOrder: 2, title: 'Merge to Main Branch', detail: 'The feature branch is merged into the main production branch by the tech lead after QA sign-off.', stepType: 'Sequence', nextStepYes: '', nextStepNo: '', sla: 0, owner: 'tech-lead@company.com', reviewer: 'tech-lead@company.com', approver: 'tech-lead@company.com', status: 'Review', attachments: [] },
    ],
  },
  {
    id: 'sop-003',
    sopId: 'SOP-003',
    title: 'Quarterly Budget Review',
    description: 'This procedure details how the Finance department reviews quarterly budget submissions from all other departments to ensure alignment with company financial goals.',
    department: 'Operations',
    cluster: 'Finance',
    group: 'Budgeting',
    section: 'Corporate',
    responsiblePerson: 'finance-lead@company.com',
    owner: 'finance-head@company.com',
    sla: 10,
    createdAt: '2024-01-05T09:00:00Z',
    updatedAt: '2024-01-05T09:00:00Z',
    status: 'Draft',
    version: '1.0',
    attachments: [],
    steps: [],
  },
];

// ----- Filter options -----
export const sopDepartments = ['HR', 'Engineering', 'Operations', 'Marketing', 'Customer Support', 'IT', 'Compliance'] as const satisfies readonly SOPDepartment[];
export const sopStatuses: SOPStatus[] = ['Draft', 'In Review', 'Approved', 'Archived'];
export const sopStepStatuses: SOPStepStatus[] = ['Pending', 'In Progress', 'Review', 'Approved', 'Rejected'];


// ----- Other Mock Data (Restored) -----
export const mockProjects: Project[] = [
  { id: 'proj-001', name: 'Q1 Marketing Campaign', description: 'Launch campaign for new product line', status: 'In Progress', sop: 'SOP-004' },
  { id: 'proj-002', name: 'New Website Launch', description: 'Deploy the redesigned company website', status: 'In Progress', sop: 'SOP-002' },
  { id: 'proj-003', name: 'Compliance Audit', description: 'Internal audit for ISO 27001 compliance', status: 'Planning', sop: 'SOP-003' },
  { id: 'proj-004', name: 'Employee Satisfaction Survey', description: 'Conduct annual employee survey and analyze results', status: 'Completed', sop: 'SOP-001' },
];


// ----- Document Templates -----
export const mockTemplates: DocumentTemplate[] = [
    {
        id: 'tpl-001',
        title: 'Budget Request Form',
        description: 'Standard form for requesting quarterly budget allocation for new projects or operational costs.',
        fields: [
            { name: 'project_name', label: 'Project Name', type: 'Text' },
            { name: 'amount', label: 'Amount Requested', type: 'Number' },
            { name: 'justification', label: 'Justification', type: 'Text' }
        ],
        content: '## Budget Request\n\n**Project Name:** {{project_name}}\n\n**Amount Requested:** {{amount}}\n\n**Justification:**\n\n{{justification}}',
        createdAt: '2024-03-15T09:00:00Z',
    },
    {
        id: 'tpl-002',
        title: 'Security Incident Report',
        description: 'Used to document any security incidents, including data breaches, unauthorized access, or policy violations.',
        fields: [
            { name: 'date', label: 'Date of Incident', type: 'Text' },
            { name: 'type', label: 'Type of Incident', type: 'Text' },
            { name: 'description', label: 'Detailed Description', type: 'Text' }
        ],
        content: '## Security Incident Report\n\n**Date of Incident:** {{date}}\n\n**Type of Incident:** {{type}}\n\n**Detailed Description:**\n\n{{description}}',
        createdAt: '2024-02-28T14:30:00Z',
    },
];



