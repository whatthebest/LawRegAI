import { SOP, SOPDepartment, SOPStatus, SOPStepStatus } from './types';

// mock data
export const mockSops: SOP[] = [
  {
    id: 'sop-001',
    title: 'New Employee Onboarding',
    description: 'Standard procedure for onboarding new hires to ensure a smooth integration into the company.',
    department: 'HR',
    responsiblePerson: 'hr@company.com',
    sla: 5,
    createdAt: '2023-10-01T10:00:00Z',
    status: 'Approved',
    cluster: 'People Ops',
    group: 'Onboarding',
    section: 'Global',
    steps: [
      { id: 'step-1-1', stepOrder: 1, title: 'Send Welcome Kit', detail: 'HR sends the welcome kit to the new employee\'s address.', sla: 1, owner: 'hr@company.com', reviewer: 'hr-manager@company.com', approver: 'hr-director@company.com', status: 'Approved', stepType: 'Sequence' },
      { id: 'step-1-2', stepOrder: 2, title: 'Setup IT Equipment', detail: 'IT department sets up laptop, accounts, and peripherals.', sla: 2, owner: 'it@company.com', reviewer: 'it-manager@company.com', approver: 'it-director@company.com', status: 'Approved', stepType: 'Sequence' },
      { id: 'step-1-3', stepOrder: 3, title: 'Department Introduction', detail: 'Hiring manager introduces the new employee to the team.', sla: 1, owner: 'jane@company.com', reviewer: 'dept-head@company.com', approver: 'dept-head@company.com', status: 'Approved', stepType: 'Sequence' },
    ],
  },
  {
    id: 'sop-002',
    title: 'Deploy to Production',
    description: 'The official process for deploying new code from staging to the production environment.',
    department: 'Engineering',
    responsiblePerson: 'tech-lead@company.com',
    sla: 1,
    createdAt: '2023-11-15T14:30:00Z',
    status: 'In Review',
    cluster: 'Core Platform',
    group: 'Deployment',
    section: 'Backend',
    steps: [
      { id: 'step-2-1', stepOrder: 1, title: 'Run Final Tests on Staging', detail: 'QA team performs final regression testing on the staging server.', sla: 1, owner: 'qa@company.com', reviewer: 'qa-lead@company.com', approver: 'tech-lead@company.com', status: 'Approved', stepType: 'Sequence' },
      { id: 'step-2-2', stepOrder: 2, title: 'Get Approval from Product Manager', detail: 'The product manager must sign off on the release.', sla: 1, owner: 'product@company.com', reviewer: 'tech-lead@company.com', approver: 'product-head@company.com', status: 'Review', stepType: 'Decision', nextStepYes: '3', nextStepNo: '1' },
      { id: 'step-2-3', stepOrder: 3, title: 'Merge to Main Branch', detail: 'The lead developer merges the release branch into main.', sla: 0, owner: 'tech-lead@company.com', reviewer: 'tech-lead@company.com', approver: 'tech-lead@company.com', status: 'Draft', stepType: 'Sequence' },
      { id: 'step-2-4', stepOrder: 4, title: 'Monitor Post-Deployment', detail: 'The on-call engineer monitors system health for 1 hour post-deployment.', sla: 1, owner: 'jane@company.com', reviewer: 'tech-lead@company.com', approver: 'tech-lead@company.com', status: 'Draft', stepType: 'Sequence' },
    ],
  },
  {
    id: 'sop-003',
    title: 'Quarterly Budget Review',
    description: 'Procedure for departmental heads to review and submit their budgets for the upcoming quarter.',
    department: 'Operations',
    responsiblePerson: 'jane@company.com',
    sla: 10,
    createdAt: '2024-01-05T09:00:00Z',
    status: 'Draft',
    cluster: 'Finance',
    group: 'Budgeting',
    section: 'Corporate',
    steps: [
      { id: 'step-3-1', stepOrder: 1, title: 'Distribute Budget Templates', detail: 'Finance team sends out budget templates to all department heads.', sla: 1, owner: 'finance@company.com', reviewer: 'finance-lead@company.com', approver: 'cfo@company.com', status: 'Draft', stepType: 'Sequence' },
      { id: 'step-3-2', stepOrder: 2, title: 'Submit Departmental Budget', detail: 'Each department head completes and submits their budget.', sla: 7, owner: 'jane@company.com', reviewer: 'finance-lead@company.com', approver: 'cfo@company.com', status: 'Review', stepType: 'Sequence' },
      { id: 'step-3-3', stepOrder: 3, title: 'Final Review by CFO', detail: 'The CFO reviews all submitted budgets for final approval.', sla: 2, owner: 'cfo@company.com', reviewer: 'cfo@company.com', approver: 'cfo@company.com', status: 'Draft', stepType: 'Sequence' },
    ],
  },
    {
    id: 'sop-004',
    title: 'Social Media Post Approval',
    description: 'Process for creating, reviewing, and publishing posts on official company social media channels.',
    department: 'Marketing',
    responsiblePerson: 'marketing@company.com',
    sla: 2,
    createdAt: '2024-02-20T11:00:00Z',
    status: 'Approved',
    cluster: 'Brand',
    group: 'Social Media',
    section: 'Public Relations',
    steps: [
      { id: 'step-4-1', stepOrder: 1, title: 'Draft Post Content', detail: 'Social media manager drafts content and visuals for the post.', sla: 1, owner: 'social@company.com', reviewer: 'marketing-lead@company.com', approver: 'legal@company.com', status: 'Approved', stepType: 'Sequence' },
      { id: 'step-4-2', stepOrder: 2, title: 'Legal Review', detail: 'Legal team reviews the post for compliance.', sla: 1, owner: 'legal@company.com', reviewer: 'legal-head@company.com', approver: 'legal-head@company.com', status: 'Approved', stepType: 'Sequence' },
    ],
  },
];

export const sopDepartments: SOPDepartment[] = ['Operations', 'Engineering', 'HR', 'Marketing'];
export const sopStatuses: SOPStatus[] = ['Draft', 'In Review', 'Approved', 'Archived'];
export const sopStepStatuses: SOPStepStatus[] = ['Draft', 'Review', 'Approved'];
