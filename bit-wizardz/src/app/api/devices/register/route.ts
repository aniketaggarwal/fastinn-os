import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { publicKey, name } = body;

        console.log('[API] Registering Device:', { name, publicKey: publicKey?.substring(0, 20) + '...' });

        if (!publicKey) {
            return NextResponse.json({ error: 'Missing public key' }, { status: 400 });
        }

        // Check if device exists
        const { data: existing } = await supabase
            .from('devices')
            .select('id')
            .eq('public_key', publicKey)
            .single();

        if (existing) {
            return NextResponse.json({
                success: true,
                message: 'Device already registered',
                id: existing.id
            });
        }

        // Insert new device
        const { data, error } = await supabase
            .from('devices')
            .insert([
                {
                    public_key: publicKey,
                    name: name || 'Unnamed Kiosk',
                    last_active: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('[API] Supabase Insert Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, device: data });

    } catch (e) {
        console.error('[API] Server Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
