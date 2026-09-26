"use client";

import { useState } from "react";
import { updateUser } from "../actions";
import { UserStatus } from "@prisma/client";

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  inactiveFrom: Date | null;
  inactiveUntil: Date | null;
  userRoles: Array<{
    role: Role;
  }>;
}

interface Props {
  user: User;
  roles: Role[];
  isCurrentUser: boolean;
  callerIsSuperAdmin: boolean;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function EditUserDialog({ user, roles, isCurrentUser, callerIsSuperAdmin }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    roleId: user.userRoles[0]?.role.id || "",
    status: user.status,
    inactiveType: user.inactiveUntil ? "temporary" : "permanent",
    inactiveFrom: user.inactiveFrom ? new Date(user.inactiveFrom).toISOString().split("T")[0] : "",
    inactiveUntil: user.inactiveUntil ? new Date(user.inactiveUntil).toISOString().split("T")[0] : "",
  });

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    if (email.length > 254) {
      setEmailError("Email is too long");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleEmailChange = (value: string) => {
    setFormData((prev) => ({ ...prev, email: value }));
    if (emailError) {
      validateEmail(value);
    }
  };

  const handleEmailBlur = () => {
    if (formData.email) {
      validateEmail(formData.email);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(formData.email)) {
      return;
    }

    setLoading(true);

    try {
      const form = new FormData();
      form.append("firstName", formData.firstName);
      form.append("lastName", formData.lastName);
      form.append("email", formData.email);
      form.append("roleId", formData.roleId);
      form.append("status", formData.status);
      form.append("inactiveType", formData.inactiveType);
      form.append("inactiveFrom", formData.inactiveFrom);
      form.append("inactiveUntil", formData.inactiveUntil);

      const result = await updateUser(user.id, form);

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setIsOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter out SUPER_ADMIN role if caller is not SUPER_ADMIN
  const availableRoles = callerIsSuperAdmin
    ? roles
    : roles.filter((role) => role.name !== "SUPER_ADMIN");

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
      >
        Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs text-left">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10 transition-colors">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Edit User</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update account details and permissions</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={handleEmailBlur}
                  pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                  title="Please enter a valid email address"
                  className={`w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border rounded-lg focus:outline-none text-sm transition-colors ${
                    emailError
                      ? "border-red-600 focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                      : "border-slate-300 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20"
                  }`}
                />
                {emailError && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{emailError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => handleChange("roleId", e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                >
                  <option value="">Select role</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="ACTIVE"
                      checked={formData.status === "ACTIVE"}
                      onChange={(e) => handleChange("status", e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="INACTIVE"
                      checked={formData.status === "INACTIVE"}
                      onChange={(e) => handleChange("status", e.target.value)}
                      disabled={isCurrentUser}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 disabled:opacity-50"
                    />
                    <span className={`text-sm ${isCurrentUser ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300 font-medium"}`}>
                      Inactive {isCurrentUser && "(Cannot deactivate yourself)"}
                    </span>
                  </label>
                </div>
              </div>

              {formData.status === "INACTIVE" && (
                <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-4 py-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">When Inactive:</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="inactiveType"
                        value="temporary"
                        checked={formData.inactiveType === "temporary"}
                        onChange={(e) => handleChange("inactiveType", e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Temporary</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="inactiveType"
                        value="permanent"
                        checked={formData.inactiveType === "permanent"}
                        onChange={(e) => handleChange("inactiveType", e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Permanent</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Inactive From</label>
                    <input
                      type="date"
                      required={formData.status === "INACTIVE"}
                      value={formData.inactiveFrom}
                      onChange={(e) => handleChange("inactiveFrom", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                    />
                  </div>

                  {formData.inactiveType === "temporary" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Inactive Until</label>
                      <input
                        type="date"
                        required={formData.inactiveType === "temporary"}
                        value={formData.inactiveUntil}
                        onChange={(e) => handleChange("inactiveUntil", e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                      />
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors shadow-xs"
                >
                  {loading ? "Updating..." : "Update User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
