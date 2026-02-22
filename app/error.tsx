'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="text-6xl mb-4">😕</div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
        حدث خطأ في هذه الصفحة
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-4 max-w-md">
        نعتذر عن الإزعاج. تم إبلاغ فريق التطوير تلقائياً وسيتم إصلاح المشكلة في أقرب وقت.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 dir-ltr">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium"
        >
          إعادة المحاولة
        </button>
        <button
          onClick={() => window.location.href = '/Performance'}
          className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-6 py-2.5 rounded-lg transition-colors font-medium"
        >
          الصفحة الرئيسية
        </button>
      </div>
    </div>
  );
}
