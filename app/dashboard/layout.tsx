import { getAuthUserId } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import DashboardShell from './components/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getAuthUserId();
  if (!userId) {
    redirect('/');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
