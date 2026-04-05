import { useQuery } from 'convex/react';
import { api } from '../../../ai-town/convex/_generated/api';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface UseDashboardResult {
  data: any | null;
  status: Status;
  error: string | null;
  refetch: () => void;
  childName: string | null;
}

// The dashboard now identifies a child by their Family Code.
// We resolve familyCode → username, then pass username into getDashboardData.
export function useDashboardData(familyCode: string | null): UseDashboardResult {
  // Step 1: resolve familyCode → username
  const userInfo = useQuery(
    api.auth.getUserByFamilyCode,
    familyCode ? { familyCode } : 'skip',
  );

  const childName = userInfo?.username ?? null;
  const isResolvingUser = familyCode !== null && userInfo === undefined;

  // Step 2: fetch dashboard data by username
  const data = useQuery(
    api.dashboard.getDashboardData,
    childName ? { childName } : 'skip',
  );

  const isLoading = isResolvingUser || (childName !== null && data === undefined);

  let status: Status = 'idle';
  let error: string | null = null;

  if (familyCode) {
    if (isLoading) {
      status = 'loading';
    } else if (userInfo === null) {
      status = 'error';
      error = 'Family Code not found. Double-check the code from your child\'s account.';
    } else if (data === null) {
      status = 'error';
      error = 'No activity found yet. Your child hasn\'t chatted in HAVEN yet.';
    } else if (data) {
      status = 'success';
    }
  }

  return {
    data,
    status,
    error,
    childName: userInfo?.displayName ?? null,
    refetch: () => { },
  };
}


