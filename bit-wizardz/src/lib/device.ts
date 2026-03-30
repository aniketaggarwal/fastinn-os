export const getDeviceId = (): string => {
    if (typeof window === 'undefined') return '';

    let deviceId = localStorage.getItem('bit_wizardz_device_id');
    if (!deviceId) {
        deviceId = `device_${crypto.randomUUID()}`;
        localStorage.setItem('bit_wizardz_device_id', deviceId);
    }
    return deviceId;
};
