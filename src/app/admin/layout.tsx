// src/app/admin/layout.tsx  (server component)
import { requireSession, requireAdminLike } from '@/lib/authz';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;            // no ISR for this tree

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  let decoded;
  try {
    decoded = await requireSession();
  } catch {
    redirect('/login');
  }

  const result = await requireAdminLike(decoded);
  if (!result.ok) {
    redirect('/login');
  }

  return <>{children}</>;
}