import Link from 'next/link';
import BackButton from '@/components/BackButton';

export default function ErrorPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center relative">
            <BackButton />
            <div className="text-red-500 text-6xl mb-4">⚠</div>
            <h1 className="text-3xl font-bold mb-2">Error</h1>
            <p className="mb-8 text-gray-600">Something went wrong. Please try again.</p>
            <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Return Home
            </Link>
        </div>
    );
}
