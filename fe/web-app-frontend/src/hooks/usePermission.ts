import { useAuth } from '@/providers/AuthProviders';

export function usePermission(code: string): boolean {
    const { profile } = useAuth();
    return profile?.permissions?.includes(code) ?? false;
}

export function useHasAnyPermission(codes: string[]): boolean {
    const { profile } = useAuth();
    if (!codes || codes.length === 0) return true;
    return codes.some(code => profile?.permissions?.includes(code));
}
