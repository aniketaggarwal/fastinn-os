/**
 * Static hotel enrichment data keyed by `domain`.
 * Used as fallback until schema_portal.sql columns are available in the DB.
 * When the DB has description/images columns populated, those take priority.
 */
export type HotelMeta = {
    description: string;
    location: string;
    city: string;
    country: string;
    star_rating: number;
    base_price: number;
    amenities: string[];
    images: string[];
};

const ENRICHMENT: Record<string, HotelMeta> = {
    'imperial.fastinn.app': {
        description: 'A world-class urban sanctuary in the heart of New Delhi, where timeless elegance meets modern luxury. Every corner tells a story of impeccable craftsmanship and unmatched service.',
        location: 'Connaught Place, New Delhi',
        city: 'New Delhi',
        country: 'India',
        star_rating: 5,
        base_price: 12500,
        amenities: ['pool', 'spa', 'gym', 'restaurant', 'bar', 'valet', 'concierge', 'wifi'],
        images: ['/hotel-rooftop.jpg', '/hotel-lobby.jpg'],
    },
    'heritage.fastinn.app': {
        description: 'Experience the grandeur of a Mughal palace converted into an opulent five-star retreat. Manicured gardens, ornate arches, and golden-lit corridors await you in royal Rajasthan.',
        location: 'Amer Road, Jaipur',
        city: 'Jaipur',
        country: 'India',
        star_rating: 5,
        base_price: 18000,
        amenities: ['pool', 'spa', 'gym', 'restaurant', 'concierge', 'wifi', 'rooftop', 'valet'],
        images: ['/hotel-heritage.jpg', '/hotel-lobby.jpg'],
    },
    'goa.fastinn.app': {
        description: 'Wake up to the sound of waves in our award-winning beachfront resort. Overwater bungalows, crystal-clear lagoons, and world-class diving make this the ultimate coastal escape.',
        location: 'Candolim Beach, North Goa',
        city: 'Goa',
        country: 'India',
        star_rating: 5,
        base_price: 9500,
        amenities: ['pool', 'spa', 'gym', 'restaurant', 'bar', 'wifi', 'parking'],
        images: ['/hotel-beach.jpg', '/hotel-rooftop.jpg'],
    },
};

export function enrichHotel(hotel: Record<string, any>): Record<string, any> {
    const meta = ENRICHMENT[hotel.domain] || {};
    return {
        ...hotel,
        description: hotel.description || meta.description || null,
        location: hotel.location || meta.location || hotel.city || null,
        city: hotel.city || meta.city || null,
        country: hotel.country || meta.country || 'India',
        star_rating: hotel.star_rating || meta.star_rating || 4,
        base_price: hotel.base_price || meta.base_price || 0,
        amenities: hotel.amenities?.length ? hotel.amenities : (meta.amenities ?? []),
        images: hotel.images?.length ? hotel.images : (meta.images ?? []),
    };
}
