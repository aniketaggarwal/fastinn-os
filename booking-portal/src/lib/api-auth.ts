import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getApiAuth(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return { error: 'Missing Authorization header', status: 401 };

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) return { error: 'Invalid or expired token', status: 401 };

    return { user, supabaseAdmin };
}
