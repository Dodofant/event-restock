"use client";

import { useState } from "react";
import AdminPinGate from "@/components/admin/AdminPinGate";
import AdminPanel from "@/components/admin/AdminPanel";

export default function AdminClientPage() {
  const [ok, setOk] = useState(false);

  if (!ok) return <AdminPinGate onUnlocked={() => setOk(true)} />;

  return <AdminPanel onLogout={() => setOk(false)} />;
}
