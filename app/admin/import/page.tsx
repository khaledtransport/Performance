"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Download,
  Table,
} from "lucide-react";

interface ImportResult {
  success: boolean;
  message: string;
  details?: {
    universitiesCreated?: number;
    driversCreated?: number;
    busesCreated?: number;
    representativesCreated?: number;
    routesCreated?: number;
    tripsCreated?: number;
  };
  errors?: string[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحميل النموذج الافتراضي
  const downloadTemplate = () => {
    // إنشاء بيانات نموذجية
    const templateData = [
      {
        الجامعة: "جامعة الملك سعود",
        السائق: "أحمد محمد",
        الباص: "BUS-101",
        المندوب: "خالد عبدالله",
        "عدد رحلات الذهاب": 3,
        "عدد رحلات العودة": 2,
        "ذهاب_7:30 AM": 25,
        "ذهاب_8:30 AM": 30,
        "ذهاب_9:30 AM": 28,
        "عودة_12:30 PM": 25,
        "عودة_1:30 PM": 30,
      },
      {
        الجامعة: "جامعة الأميرة نورة",
        السائق: "محمد علي",
        الباص: "BUS-102",
        المندوب: "سعد إبراهيم",
        "عدد رحلات الذهاب": 2,
        "عدد رحلات العودة": 2,
        "ذهاب_8:30 AM": 35,
        "ذهاب_10:30 AM": 32,
        "عودة_2:30 PM": 35,
        "عودة_4:30 PM": 32,
      },
      {
        الجامعة: "جامعة الإمام",
        السائق: "عبدالرحمن سالم",
        الباص: "BUS-103",
        المندوب: "فهد العتيبي",
        "عدد رحلات الذهاب": 4,
        "عدد رحلات العودة": 3,
        "ذهاب_7:30 AM": 20,
        "ذهاب_8:30 AM": 25,
        "ذهاب_9:30 AM": 22,
        "ذهاب_10:30 AM": 18,
        "عودة_1:30 PM": 20,
        "عودة_3:30 PM": 25,
        "عودة_5:30 PM": 22,
      },
    ];

    // تحويل البيانات إلى CSV
    const headers = Object.keys(templateData[0]);
    const csvRows = [
      headers.join(","),
      ...templateData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] ?? "";
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value;
          })
          .join(",")
      ),
    ];

    // إنشاء Blob وتحميله
    const BOM = "\uFEFF"; // لدعم العربية في Excel
    const csvContent = BOM + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "نموذج_استيراد_الرحلات.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // التحقق من نوع الملف
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (
        !validTypes.includes(selectedFile.type) &&
        !selectedFile.name.endsWith(".xlsx") &&
        !selectedFile.name.endsWith(".xls") &&
        !selectedFile.name.endsWith(".csv")
      ) {
        setResult({
          success: false,
          message: "يرجى اختيار ملف صالح (.xlsx أو .xls أو .csv)",
        });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/Performance/api/import/excel", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "تم استيراد البيانات بنجاح",
          details: data.details,
        });
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setResult({
          success: false,
          message: data.error || "فشل استيراد البيانات",
          errors: data.errors,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "حدث خطأ أثناء رفع الملف",
        errors: [error instanceof Error ? error.message : "خطأ غير معروف"],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              استيراد من Excel
            </h1>
            <p className="text-slate-600">
              رفع ملف Excel لاستيراد البيانات تلقائياً
            </p>
          </div>
          <Link href="/admin">
            <Button
              variant="outline"
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للإدارة
            </Button>
          </Link>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Upload Card */}
          <Card className="bg-white border-slate-200 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
                رفع ملف Excel
              </CardTitle>
              <CardDescription>
                اختر ملف Excel يحتوي على بيانات الرحلات والمسارات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Download Template Button */}
              <div className="flex gap-2">
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="flex-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                >
                  <Download className="w-4 h-4 ml-2" />
                  تحميل النموذج الافتراضي
                </Button>
              </div>

              {/* File Input */}
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-blue-300 transition-colors">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-file"
                />
                <label
                  htmlFor="excel-file"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-slate-400 mb-4" />
                  <span className="text-slate-600 mb-2">
                    {file ? file.name : "اضغط لاختيار ملف أو اسحبه هنا"}
                  </span>
                  <span className="text-sm text-slate-400">
                    يدعم ملفات .xlsx و .xls و .csv
                  </span>
                </label>
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!file || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الاستيراد...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 ml-2" />
                    استيراد البيانات
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Result Card */}
          {result && (
            <Card
              className={`border ${
                result.success
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3
                      className={`font-semibold ${
                        result.success ? "text-green-800" : "text-red-800"
                      }`}
                    >
                      {result.message}
                    </h3>

                    {/* Details */}
                    {result.details && (
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        {result.details.universitiesCreated !== undefined && (
                          <div className="bg-white/50 rounded p-2">
                            <span className="text-slate-600">الجامعات:</span>{" "}
                            <span className="font-semibold">
                              {result.details.universitiesCreated}
                            </span>
                          </div>
                        )}
                        {result.details.driversCreated !== undefined && (
                          <div className="bg-white/50 rounded p-2">
                            <span className="text-slate-600">السائقين:</span>{" "}
                            <span className="font-semibold">
                              {result.details.driversCreated}
                            </span>
                          </div>
                        )}
                        {result.details.busesCreated !== undefined && (
                          <div className="bg-white/50 rounded p-2">
                            <span className="text-slate-600">الباصات:</span>{" "}
                            <span className="font-semibold">
                              {result.details.busesCreated}
                            </span>
                          </div>
                        )}
                        {result.details.routesCreated !== undefined && (
                          <div className="bg-white/50 rounded p-2">
                            <span className="text-slate-600">المسارات:</span>{" "}
                            <span className="font-semibold">
                              {result.details.routesCreated}
                            </span>
                          </div>
                        )}
                        {result.details.tripsCreated !== undefined && (
                          <div className="bg-white/50 rounded p-2">
                            <span className="text-slate-600">الرحلات:</span>{" "}
                            <span className="font-semibold">
                              {result.details.tripsCreated}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Errors */}
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-semibold text-red-700 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          تفاصيل الأخطاء:
                        </h4>
                        <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                          {result.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions Card */}
          <Card className="bg-white border-slate-200 shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">
                تعليمات الاستخدام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-slate-600 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  قم بتحميل النموذج الافتراضي أعلاه
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  افتح الملف في Excel وأضف بياناتك
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  احفظ الملف بتنسيق .xlsx أو .csv
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">4.</span>
                  ارفع الملف وسيتم إنشاء البيانات تلقائياً
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Template Preview Card */}
          <Card className="bg-white border-slate-200 shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <Table className="w-5 h-5 text-blue-600" />
                معاينة تنسيق الملف
              </CardTitle>
              <CardDescription>الأعمدة المطلوبة في ملف Excel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">
                        العمود
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">
                        الوصف
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">
                        مثال
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700">
                        مطلوب
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-200 px-3 py-2 font-medium text-blue-600">
                        الجامعة
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">
                        اسم الجامعة
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-500">
                        جامعة الملك سعود
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        ✅
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-200 px-3 py-2 font-medium text-blue-600">
                        السائق
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">
                        اسم السائق
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-500">
                        أحمد محمد
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        ✅
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 px-3 py-2 font-medium text-blue-600">
                        الباص
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">
                        رقم الباص
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-500">
                        BUS-101
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        ✅
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-200 px-3 py-2 font-medium text-blue-600">
                        المندوب
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">
                        اسم المندوب
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-500">
                        خالد عبدالله
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        ✅
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 px-3 py-2 font-medium text-purple-600">
                        عدد رحلات الذهاب
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">
                        عدد رحلات الذهاب اليومية
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-500">
                        3
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        ⚪
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-200 px-3 py-2 font-medium text-purple-600">
                        عدد رحلات العودة
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">
                        عدد رحلات العودة اليومية
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-500">
                        2
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        ⚪
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 px-3 py-2 font-medium text-green-600">
                        ذهاب_7:30 AM
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">
                        عدد الطلاب في رحلة 7:30
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-500">
                        25
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        ⚪
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-200 px-3 py-2 font-medium text-green-600">
                        ذهاب_8:30 AM
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">
                        عدد الطلاب في رحلة 8:30
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-500">
                        30
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        ⚪
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 px-3 py-2 font-medium text-orange-600">
                        عودة_12:30 PM
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">
                        عدد الطلاب في رحلة 12:30
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-500">
                        25
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        ⚪
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-200 px-3 py-2 font-medium text-orange-600">
                        عودة_1:30 PM
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">
                        عدد الطلاب في رحلة 1:30
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-500">
                        30
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        ⚪
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                  أوقات الرحلات المتاحة:
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700 font-medium">
                      رحلات الذهاب:
                    </span>
                    <p className="text-slate-600 mt-1">
                      7:30 AM, 8:30 AM, 9:30 AM, 10:30 AM, 11:30 AM, 12:30 PM,
                      1:30 PM, 2:30 PM, المجمّع
                    </p>
                  </div>
                  <div>
                    <span className="text-orange-700 font-medium">
                      رحلات العودة:
                    </span>
                    <p className="text-slate-600 mt-1">
                      12:30 PM, 1:30 PM, 2:30 PM, 3:30 PM, 4:30 PM, 5:30 PM,
                      المجمّع
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
