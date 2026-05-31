"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "user" | "moderator" | "admin";

const ROLES: { value: Role; label: string }[] = [
  { value: "user",      label: "Mitglied" },
  { value: "moderator", label: "Moderator" },
  { value: "admin",     label: "Admin" },
];

export default function UserRoleManager({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleChange(newRole: Role) {
    setLoading(true);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    setRole(newRole);
    setLoading(false);
    router.refresh();
  }

  return (
    <select
      value={role}
      onChange={(e) => handleChange(e.target.value as Role)}
      disabled={loading}
      className="text-xs bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 disabled:opacity-50 cursor-pointer"
    >
      {ROLES.map((r) => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
  );
}
