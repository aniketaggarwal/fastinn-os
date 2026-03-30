import localforage from 'localforage';

localforage.config({
    name: 'hotel-checkin',
    storeName: 'key-store',
});

export const storage = localforage;
