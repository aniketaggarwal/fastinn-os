import { supabase } from './supabase';

export type UserRole = 'admin' | 'reception' | 'housekeeping' | 'guest';

export interface TenantSession {
    hotelId: string | null;
    role: UserRole;
}

/**
 * Fetches the current user's role and hotel association.
 * If no explicit hotel_users mapping exists, the user is a generic 'guest'.
 */
export async function getUserAccess(): Promise<TenantSession> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { hotelId: null, role: 'guest' };
    }

    const { data: mapping, error } = await supabase
        .from('hotel_users')
        .select('hotel_id, role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'reception', 'housekeeping', 'manager', 'staff', 'owner'])
        .order('role', { ascending: true })  // admin comes first alphabetically... use created_at in prod
        .limit(1)
        .maybeSingle();

    if (mapping && !error) {
        return {
            hotelId: mapping.hotel_id,
            role: mapping.role as UserRole
        };
    }

    // Default to guest if no mapping
    return { hotelId: null, role: 'guest' };
}

/**
 * Higher order check for protecting routes manually on the client
 * (For server-side protecting, use layout.tsx with supabase server client)
 */
export async function requireRole(allowedRoles: UserRole[], fallbackRoute: string = '/menu') {
    const access = await getUserAccess();
    if (!allowedRoles.includes(access.role)) {
        if (typeof window !== 'undefined') {
            window.location.href = fallbackRoute;
        }
    }
    return access;
}
