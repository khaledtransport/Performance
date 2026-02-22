'use client';

import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Copy, Check } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  busNumber: string;
  busId: string;
}

export default function QRCodeModal({ isOpen, onClose, busNumber, busId }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // رابط التتبع المباشر للحافلة
  const trackingUrl = `${window.location.origin}/Performance/tracking?bus=${busId}`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = trackingUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [trackingUrl]);

  const handleDownload = useCallback(() => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      
      // خلفية بيضاء
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 512, 512);
      
      // رسم QR
      ctx.drawImage(img, 0, 0, 512, 512);
      
      // تحميل كصورة PNG
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `qr-bus-${busNumber}.png`;
      downloadLink.click();

      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, [busNumber]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* الهيدر */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            رمز QR — حافلة {busNumber}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center p-6 space-y-4">
          <div
            ref={qrRef}
            className="bg-white p-4 rounded-xl shadow-inner"
          >
            <QRCodeSVG
              value={trackingUrl}
              size={220}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            امسح الرمز لفتح صفحة تتبع الحافلة مباشرة
          </p>

          {/* رابط التتبع */}
          <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">رابط التتبع:</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 break-all dir-ltr text-left">
              {trackingUrl}
            </p>
          </div>
        </div>

        {/* الأزرار */}
        <div className="flex gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition-colors font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            تحميل PNG
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 py-2.5 rounded-lg transition-colors font-medium text-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                تم النسخ!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                نسخ الرابط
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
