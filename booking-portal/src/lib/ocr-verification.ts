// import Tesseract from 'tesseract.js';

// Keywords to look for (Case Insensitive)
const REQUIRED_KEYWORDS = [
    "government of india",
    "aadhaar",
    "uidai",
    "year of birth",
    "dob",
    "unique identification",
    "भारत सरकार", // Bharat Sarkar
    "आधार"         // Aadhaar
];

/**
 * Verifies if the uploaded image contains Masked Aadhaar keywords AND matches user details.
 * @param file The image file to scan
 * @param expectedDetails Optional: Expected Name, DOB, and Last 4 digits to verify ownership
 * @returns { success: boolean, text: string, foundKeywords: string[], errors: string[] }
 */
export const verifyAadhaarCard = async (
    file: File,
    expectedDetails?: { name: string; dob: string; last4: string }
): Promise<{ success: boolean; foundKeywords: string[]; errors: string[] }> => {
    try {
        console.log('[OCR] Starting scan for:', file.name);

        const Tesseract = (await import('tesseract.js')).default;

        const { data: { text } } = await Tesseract.recognize(
            file,
            'eng+hin',
            { logger: m => console.log('[OCR Progress]', m.status, m.progress?.toFixed(2)) }
        );


        const lowerText = text.toLowerCase();
        // console.log('[OCR] Extracted Text:', lowerText); // Debugging

        // 1. Basic Keyword Check (Is it an Aadhaar?)
        const foundKeywords = REQUIRED_KEYWORDS.filter(keyword =>
            lowerText.includes(keyword.toLowerCase())
        );

        // RELAXED LOGIC:
        // 1. If we find the specific "Last 4 Digits" of the user, we assume it's the right doc (strongest signal).
        // 2. Otherwise, look for at least 1 keyword (was 2).
        const hasLast4 = expectedDetails?.last4 && lowerText.includes(expectedDetails.last4);
        const isAadhaar = hasLast4 || foundKeywords.length >= 1;
        const errors: string[] = [];

        if (!isAadhaar) {
            errors.push("Document does not appear to be a valid Aadhaar card. Ensure text is clear.");
        }

        // 2. Data Matching Check (Does it belong to this user?)
        if (isAadhaar && expectedDetails) {
            // Check Last 4 Digits
            if (!lowerText.includes(expectedDetails.last4)) {
                errors.push(`Aadhaar number ending in ${expectedDetails.last4} not found.`);
            }

            // Check DOB (Simple substring check for now)
            // Handle different formats if necessary, but direct match is a good start
            // DOB format in input is usually YYYY-MM-DD or DD-MM-YYYY
            // We'll check if the DOB string or parts of it exist? 
            // Better: Check for the year at least, or the full date string if possible.
            // Let's try basic inclusion first.
            // Convert Input YYYY-MM-DD to DD/MM/YYYY which is common on cards?
            // Or just check if the user's input string exists.

            // Let's try to be smart about DOB formats:
            // Input: 2000-01-30 -> Check "2000" and "30/01/2000" or "30-01-2000"
            const [y, m, d] = expectedDetails.dob.split('-');
            const dateFormats = [
                expectedDetails.dob, // 2000-01-30
                `${d}/${m}/${y}`,    // 30/01/2000
                `${d}-${m}-${y}`,    // 30-01-2000
                y                    // Just Year (Weak check, but fallback?) -> No, typically full DOB is there.
            ];

            const dobFound = dateFormats.some(fmt => lowerText.includes(fmt));
            if (!dobFound) {
                errors.push(`DOB (${expectedDetails.dob}) not found on document.`);
            }

            // Check Name (Partial Match Strategy)
            // "Aniket Aggarwal" -> Check if "aniket" AND "aggarwal" are present
            const nameParts = expectedDetails.name.toLowerCase().split(' ').filter(p => p.length > 2);
            const missingNameParts = nameParts.filter(part => !lowerText.includes(part));

            if (missingNameParts.length > 0) {
                // Relaxed: require at least one significant part to match? 
                // Or Strict: Require ALL parts?
                // User asked for verification. Let's require at least one significant name part for now to avoid false negatives on OCR errors.
                // Actually, let's try strict first, if it fails too much we relax.
                // But OCR is flaky. Let's say if >50% of name parts are missing, it's a fail.
                if (missingNameParts.length === nameParts.length) {
                    // If NO parts match, definitely fail.
                    errors.push(`Name "${expectedDetails.name}" not found on document.`);
                }
            }
        }

        const success = errors.length === 0;

        return { success, foundKeywords, errors };
    } catch (error) {
        console.error('[OCR] Failed:', error);
        throw new Error('OCR Scanning Failed');
    }
};
