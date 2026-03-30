import { supabase } from './supabase';

/**
 * Generates the full URL for the check-in session using the unique nonce.
 * This URL is what should be encoded in the QR code.
 */
export const getSessionQrUrl = (nonce: string): string => {
    // Ensure we are on the client to get window.location, otherwise return relative
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/checkin?nonce=${nonce}`;
};

/**
 * Subscribes to real-time updates for a specific check-in session.
 * 
 * @param nonce - The unique session nonce to monitor
 * @param onUpdate - Callback function triggered when status changes
 * @returns cleanup function to unsubscribe
 */
export const monitorCheckinStatus = (
    nonce: string,
    onUpdate: (status: string, payload: any) => void
) => {
    const channel = supabase
        .channel(`checkin-${nonce}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'checkins',
                filter: `nonce=eq.${nonce}`
            },
            (payload) => {
                if (payload.new.status === 'verified' || payload.new.status === 'completed') {
                    onUpdate('verified', payload.new);
                }
            }
        )
        .subscribe();

    // Return cleanup function
    return () => {
        supabase.removeChannel(channel);
    };
};

/**
 * Fallback polling mechanism in case WebSocket subscription fails or takes too long
 */
export const pollCheckinStatus = (
    nonce: string,
    onVerified: (payload: any) => void
) => {
    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
        const { data, error } = await supabase
            .from('checkins')
            .select('*')
            .eq('nonce', nonce)
            .single();

        if (error) return;

        if (data && (data.status === 'verified' || data.status === 'completed')) {
            onVerified(data);
            clearInterval(intervalId);
        }
    };

    // Poll every 3 seconds
    intervalId = setInterval(checkStatus, 3000);

    // Initial check almost immediately
    setTimeout(checkStatus, 500);

    return () => clearInterval(intervalId);
};
