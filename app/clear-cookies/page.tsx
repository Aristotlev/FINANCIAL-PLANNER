"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClearCookiesPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Clearing cookies...");

  useEffect(() => {
    const clearCookies = () => {
      const cookies = document.cookie.split(";");

      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        
        // Clear cookie for current domain and path
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
      }
      
      setStatus("✅ All cookies cleared! Redirecting to login...");
      
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    };

    clearCookies();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <div className="rounded-lg bg-gray-800 p-8 shadow-xl">
        <h1 className="mb-4 text-2xl font-bold">System Maintenance</h1>
        <p className="text-lg text-gray-300">{status}</p>
      </div>
    </div>
  );
}
