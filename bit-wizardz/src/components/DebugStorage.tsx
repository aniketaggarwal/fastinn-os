'use client';

import { useState } from 'react';
import { storage } from '@/lib/storage';

export default function DebugStorage() {
    const [keys, setKeys] = useState<string[]>([]);
    const [dump, setDump] = useState<string>('');

    const scanKeys = async () => {
        const k: string[] = [];
        await storage.iterate((value, key) => {
            k.push(key);
        });
        setKeys(k);
        if (k.length === 0) setDump('Storage is empty.');
    };

    const clearStorage = async () => {
        if (confirm('Are you sure you want to wipe all data?')) {
            await storage.clear();
            alert('Storage cleared.');
            setKeys([]);
            setDump('');
        }
    };

    return (
        <div className="p-4 border border-red-200 bg-red-50 rounded mt-4">
            <h3 className="font-bold text-red-800">🛠️ Debug Storage</h3>
            <div className="flex gap-2 my-2">
                <button
                    onClick={scanKeys}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                    Scan IndexedDB Keys
                </button>
                <button
                    onClick={clearStorage}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                    Wipe All Data
                </button>
            </div>
            {keys.length > 0 && (
                <div className="bg-black text-green-400 p-2 text-xs font-mono rounded max-h-32 overflow-auto">
                    {keys.map(k => <div key={k}>{k}</div>)}
                </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
                {dump}
            </div>

            <div className="mt-4 pt-4 border-t border-red-200">
                <button
                    onClick={async () => {
                        try {
                            const testKey = 'debug_test_' + Date.now();
                            await storage.setItem(testKey, 'Verification Value');
                            const val = await storage.getItem(testKey);
                            if (val === 'Verification Value') {
                                alert('✅ Storage Write/Read SUCCESS!');
                            } else {
                                alert('❌ Storage Read MISMATCH!');
                            }
                            await storage.removeItem(testKey);
                        } catch (e) {
                            alert('❌ Storage Failed: ' + e);
                        }
                    }}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-bold"
                >
                    Run Active Storage Validity Test
                </button>
            </div>
        </div>
    );
}
