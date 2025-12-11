"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin dashboard
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-white text-xl mb-2">Redirecting...</div>
        <div className="text-gray-400 text-sm">Taking you to the admin dashboard</div>
      </div>
    </div>
  );
}
