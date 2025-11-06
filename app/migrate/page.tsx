'use client';

import { useState } from 'react';

export default function MigratePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleMigrate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/migrate-bots', {
        method: 'POST',
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Bot Migration</h1>
          <p className="mt-2 text-gray-600">
            Click the button below to migrate platform bots to the database
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleMigrate}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Migrating...' : 'Migrate Bots'}
          </button>
        </div>

        {result && (
          <div className="mt-8 p-6 rounded-lg border bg-gray-50">
            <h2 className="text-xl font-semibold mb-4">Migration Result</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
