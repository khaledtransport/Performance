'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'Cairo, sans-serif',
            backgroundColor: '#0f172a',
            color: '#f1f5f9',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '4rem',
              marginBottom: '1rem',
            }}
          >
            ⚠️
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
            }}
          >
            حدث خطأ غير متوقع
          </h1>
          <p
            style={{
              color: '#94a3b8',
              marginBottom: '1.5rem',
              maxWidth: '400px',
            }}
          >
            نعتذر عن هذا الخطأ. تم إرسال تقرير تلقائي لفريق التطوير.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                marginBottom: '1rem',
                direction: 'ltr',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
