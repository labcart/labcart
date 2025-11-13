'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [installCommand, setInstallCommand] = useState('');
  const [generatingToken, setGeneratingToken] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkSession();
  }, []);

  const handleGitHubLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      console.error('Error logging in:', error);
      alert('Failed to login: ' + error.message);
      setLoading(false);
    }
    // Don't set loading false here - page will redirect
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();

    // DON'T clear all localStorage - only clear auth-related data
    // Workspace state (tabs, etc.) should persist across logout/login
    // The Supabase SDK automatically clears its own auth tokens

    setIsLoggedIn(false);
    setLoading(false);
    router.push('/login');
  };

  const handleGenerateInstallToken = async () => {
    setGeneratingToken(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in first');
        return;
      }

      const response = await fetch('/api/install/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to generate install token');
      }

      const data = await response.json();
      setInstallCommand(data.installCommand);
    } catch (error) {
      console.error('Error generating install token:', error);
      alert('Failed to generate install command: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyCommand = () => {
    if (installCommand) {
      navigator.clipboard.writeText(installCommand);
      alert('Install command copied to clipboard!');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <div className="w-full max-w-md space-y-8 p-8 rounded-lg border" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
        <div className="text-center">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
            Welcome to LabCart
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text)', opacity: 0.7 }}>
            Sign in to access your AI bot team
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {isLoggedIn ? (
            <>
              {/* Bot Server Setup Section */}
              <div className="p-4 rounded-md border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
                  Bot Server Setup
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text)', opacity: 0.7 }}>
                  Install your own bot server to connect to this account
                </p>

                <button
                  onClick={handleGenerateInstallToken}
                  disabled={generatingToken}
                  className="w-full rounded-md px-4 py-2 text-sm font-medium transition-colors mb-3"
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    opacity: generatingToken ? 0.5 : 1,
                    cursor: generatingToken ? 'not-allowed' : 'pointer'
                  }}
                >
                  {generatingToken ? 'Generating...' : 'Generate Install Command'}
                </button>

                {installCommand && (
                  <div className="space-y-2">
                    <div className="p-3 rounded text-xs font-mono overflow-x-auto" style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4' }}>
                      {installCommand}
                    </div>
                    <button
                      onClick={handleCopyCommand}
                      className="w-full rounded-md px-4 py-2 text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: 'var(--border)',
                        color: 'var(--text)'
                      }}
                    >
                      Copy to Clipboard
                    </button>
                    <p className="text-xs" style={{ color: 'var(--text)', opacity: 0.6 }}>
                      Run this command on your server to install and connect the bot server.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push('/')}
                className="w-full flex items-center justify-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#24292e',
                  color: 'white'
                }}
              >
                Go to App
              </button>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Logging out...' : 'Logout'}
              </button>
            </>
          ) : (
            <button
              onClick={handleGitHubLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors"
              style={{
                backgroundColor: '#24292e',
                color: 'white',
                opacity: loading ? 0.5 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                  clipRule="evenodd"
                />
              </svg>
              {loading ? 'Signing in...' : 'Sign in with GitHub'}
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--text)', opacity: 0.5 }}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
