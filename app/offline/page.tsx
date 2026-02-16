"use client";

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 p-4"
      dir="rtl"
    >
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 p-6 bg-slate-100 dark:bg-slate-800 rounded-full w-24 h-24 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M8.464 15.536a5 5 0 010-7.072M15.536 8.464a5 5 0 010 7.072M12 12h.01"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
          لا يوجد اتصال بالإنترنت
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          تحقق من اتصالك وأعد المحاولة. سيعمل التطبيق تلقائياً عند استعادة
          الاتصال.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
