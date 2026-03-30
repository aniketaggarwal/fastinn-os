import Link from 'next/link';
import BackButton from '@/components/BackButton';

export default function SuccessPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center relative">
            <BackButton />
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h1 className="text-3xl font-bold mb-2">Success!</h1>
            <p className="mb-8 text-gray-600">Your operation was completed successfully.</p>
            <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Return Home
            </Link>
        </div>
    );
}
