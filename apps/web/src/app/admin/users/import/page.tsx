"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";

export default function AdminBulkImportPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/admin/users/bulk-import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setResult(data.data);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">
          {t("admin.nav.bulkImport") || "Bulk Import Users"}
        </h2>

        <div className="bg-glass rounded-xl p-6 border border-white/10 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Upload CSV/Excel File</h3>
          <p className="text-gray-400 mb-4">
            Upload a CSV or Excel file containing wallet addresses. Each wallet will be registered as a Level 1 user.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Required columns: wallet_address
            </label>
            <label className="block text-sm font-medium text-gray-400 mb-4">
              Optional columns: email, name, referrer_wallet
            </label>
          </div>

          <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-white mb-2">
                {file ? file.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-sm text-gray-400">CSV or Excel files only</p>
            </label>
          </div>

          {file && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-6 py-3 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : "Upload & Import"}
              </button>
            </div>
          )}
        </div>

        {result && (
          <div className="bg-glass rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Import Results</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-gray-400">Successful</span>
                </div>
                <p className="text-2xl font-bold text-green-400">{result.successful || 0}</p>
              </div>

              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-gray-400">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-400">{result.failed || 0}</p>
              </div>

              <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-gray-400">Total</span>
                </div>
                <p className="text-2xl font-bold text-yellow-400">{result.total || 0}</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Errors:</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.errors.map((error: string, index: number) => (
                    <div key={index} className="text-sm text-red-400 bg-red-500/10 rounded p-2">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

