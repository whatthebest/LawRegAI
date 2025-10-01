import { z } from "zod";

export const departments = ["Operations", "Engineering", "HR" , "Compliance"] as const;
export const roles       = ["Owner", "Reviewer", "Approver"] as const;           // workflow role
export const systemRoles = ["RegTechTeam", "Manager", "User"] as const;           // app/RBAC role

// helper: convert "" -> undefined for optional inputs
const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema);

export const profileExtrasSchema = z.object({
  employeeId: emptyToUndef(z.string().min(1).max(20).regex(/^[A-Za-z0-9._-]+$/)).optional(),
  contactNumber: emptyToUndef(
    z.string().regex(/^[0-9+\-\s().]{7,20}$/, "Invalid phone")
  ).optional(),
  cluster: emptyToUndef(z.string()).optional(),
  businessUnit: emptyToUndef(z.string()).optional(),
  team: emptyToUndef(z.string()).optional(),
  managerName: emptyToUndef(z.string()).optional(),
  managerEmail: emptyToUndef(z.string().email()).optional(),
  groupTh: emptyToUndef(z.string()).optional(), // กลุ่ม
});

// trim + lowercase email; trim fullname
export const profileSchema = z.object({
  fullname: z.string().min(2).transform((s) => s.trim()),
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  department: z.enum(departments),
  role: z.enum(roles),
  systemRole: z.enum(systemRoles),
}).merge(profileExtrasSchema);

export type UserProfileDTO = z.infer<typeof profileSchema>;

export const createUserWithPasswordSchema = profileSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  mustChangePassword: z.boolean().optional().default(false),
});
export type CreateUserWithPasswordDTO = z.infer<typeof createUserWithPasswordSchema>;
