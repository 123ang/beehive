"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Network } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { MatrixViewerCytoscape } from "@/components/admin/MatrixViewerCytoscape";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminMatrixPage() {
  const router = useRouter();
  const [matrixWallet, setMatrixWallet] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Search Bar */}
        <Card className="p-4 mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by wallet address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    setMatrixWallet(searchQuery.trim());
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-honey-500/50"
              />
            </div>
            <Button
              onClick={() => {
                if (searchQuery.trim()) {
                  setMatrixWallet(searchQuery.trim());
                }
              }}
              disabled={!searchQuery.trim()}
            >
              Load Tree
            </Button>
          </div>
        </Card>

        {/* Matrix Viewer */}
        {matrixWallet ? (
          <MatrixViewerCytoscape
            walletAddress={matrixWallet}
            onSearch={(wallet) => {
              setSearchQuery(wallet);
              setMatrixWallet(wallet);
            }}
          />
        ) : (
          <Card className="p-12 text-center">
            <Network className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">3x3 Matrix Viewer</h3>
            <p className="text-gray-400 mb-6">
              Enter a wallet address above to view the member's 3x3 matrix tree structure
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>• View tree depth and structure</p>
              <p>• See member details and statistics</p>
              <p>• Zoom in/out and pan around</p>
              <p>• Export as PNG or PDF</p>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

