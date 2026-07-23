import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  User, 
  Check, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Info,
  ChevronDown
} from "lucide-react";
import { LeaveRequest } from "./TeacherLeavesView";

interface AdminLeavesViewProps {
  token: string;
  userDirectory: any[];
  adminOrganizationId?: string;
}

export default function AdminLeavesView({
  token,
  userDirectory = [],
  adminOrganizationId
}: AdminLeavesViewProps) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  
  // Filtering & Search
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("Pending");
  
  // Messages
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Helper: Find teacher record in userDirectory by any ID/code/username/email variant or name
  const findTeacher = (teacherId: any, teacherName?: string) => {
    if (!userDirectory || userDirectory.length === 0) return null;

    let targetIdStr = "";
    if (typeof teacherId === "object" && teacherId !== null) {
      targetIdStr = String(teacherId._id || teacherId.id || "").trim().toLowerCase();
    } else {
      targetIdStr = String(teacherId || "").trim().toLowerCase();
    }

    const targetNameStr = String(teacherName || "").trim().toLowerCase();

    return userDirectory.find((u: any) => {
      if (!u) return false;
      const uId = String(u._id || u.id || "").trim().toLowerCase();
      const uUserId = String(u.user_id || "").trim().toLowerCase();
      const uTeacherId = String(u.teacher_id || "").trim().toLowerCase();
      const uUsername = String(u.username || "").trim().toLowerCase();
      const uEmail = String(u.email || "").trim().toLowerCase();
      const uNic = String(u.nic || u.employee_id || u.regNo || u.reg_no || "").trim().toLowerCase();

      // Check ID & credential matches
      if (targetIdStr) {
        if (
          uId === targetIdStr ||
          uUserId === targetIdStr ||
          uTeacherId === targetIdStr ||
          uUsername === targetIdStr ||
          uEmail === targetIdStr ||
          uNic === targetIdStr
        ) {
          return true;
        }
      }

      // Check name match
      if (targetNameStr) {
        const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase();
        const displayName = String(u.name || "").trim().toLowerCase();
        if (fullName === targetNameStr || displayName === targetNameStr || uUsername === targetNameStr) {
          return true;
        }
      }

      return false;
    });
  };

  // Helper: Format teacher name
  const getTeacherName = (leave: LeaveRequest) => {
    if (leave.teacher_name && leave.teacher_name.trim()) {
      return leave.teacher_name.trim();
    }
    const t = findTeacher(leave.teacher_id, leave.teacher_name);
    if (t) {
      const first = t.first_name || "";
      const last = t.last_name || "";
      const full = `${first} ${last}`.trim();
      if (full) return full;
      if (t.name) return t.name;
      if (t.username) return t.username;
    }
    if (leave.teacher_id) {
      return `Instructor (${leave.teacher_id})`;
    }
    return "Unknown Instructor";
  };

  // Helper: Get Teacher Email / Contact Info
  const getTeacherContact = (leave: LeaveRequest) => {
    const t = findTeacher(leave.teacher_id, leave.teacher_name);
    if (t) {
      return t.email || t.username || t.phone || "";
    }
    return leave.teacher_id || "";
  };

  // Helper: Normalize Organization ID
  const normalizeOrgId = (id: any): string => {
    if (!id) return "";
    if (typeof id === "object") {
      id = id._id || id.id || id;
    }
    return String(id).trim().toLowerCase();
  };

  // Helper: Normalize Status Case
  const normalizeStatus = (status: any): "Pending" | "Approved" | "Rejected" => {
    if (!status) return "Pending";
    const str = String(status).trim().toLowerCase();
    if (str === "approved") return "Approved";
    if (str === "rejected" || str === "declined") return "Rejected";
    return "Pending";
  };

  // Fetch Leaves
  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const currentOrgId = adminOrganizationId;
      const res = await fetch("/rel/teacherLeave/retrieve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(currentOrgId ? { organization_id: currentOrgId } : {})
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Merge API results with local cache to be safe against offline network drops
          const local = localStorage.getItem("abms_rel_teacher_leaves");
          const localList: LeaveRequest[] = local ? JSON.parse(local) : [];
          
          const map = new Map<string, LeaveRequest>();
          data.filter(Boolean).forEach((item: any) => {
            const key = String(item._id || item.id || Math.random());
            map.set(key, item);
          });
          localList.filter(Boolean).forEach((item: any) => {
            const key = String(item._id || item.id || "");
            if (key && !map.has(key)) {
              map.set(key, item);
            }
          });

          setLeaves(Array.from(map.values()));
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("API retrieve leaves error, falling back to local cache:", err);
    }

    // Fallback
    const local = localStorage.getItem("abms_rel_teacher_leaves");
    if (local) {
      setLeaves(JSON.parse(local));
    } else {
      setLeaves([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLeaves();
  }, [token, adminOrganizationId]);

  // Handle Approve / Reject Leave Decision
  const handleUpdateStatus = async (leafId: string, newStatus: "Approved" | "Rejected") => {
    setIsProcessingId(leafId);
    setErrorMsg("");
    setSuccessMsg("");

    let apiSucceeded = false;
    let apiErrorMsg = "";

    try {
      const res = await fetch(`/rel/teacherLeave/update/${leafId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setSuccessMsg(`Leave request successfully ${newStatus.toLowerCase()} and saved in database!`);
        // Update local state directly for responsive UI
        setLeaves(prev => prev.map(item => {
          if ((item._id && item._id === leafId) || (item.id && item.id === leafId)) {
            return { ...item, status: newStatus };
          }
          return item;
        }));
        const local = localStorage.getItem("abms_rel_teacher_leaves");
        if (local) {
          const currentList: LeaveRequest[] = JSON.parse(local);
          const updated = currentList.map((item: LeaveRequest) => {
            if (item._id === leafId || item.id === leafId) {
              return { ...item, status: newStatus };
            }
            return item;
          });
          localStorage.setItem("abms_rel_teacher_leaves", JSON.stringify(updated));
        }
        await fetchLeaves();
        setIsProcessingId(null);
        return;
      } else {
        const errData = await res.json().catch(() => ({}));
        apiErrorMsg = errData.message || errData.error || `Server responded with status ${res.status}`;
      }
    } catch (err: any) {
      console.warn("API leave status update failed, fallback to local caching:", err);
      apiErrorMsg = err.message || "Network connection failure";
    }

    if (apiErrorMsg && apiErrorMsg !== "Failed to fetch" && !apiErrorMsg.includes("Network")) {
      setErrorMsg(`API Status Update Failed: ${apiErrorMsg}`);
      setIsProcessingId(null);
      return;
    }

    // Local Storage Fallback Update
    const local = localStorage.getItem("abms_rel_teacher_leaves");
    if (local) {
      const currentList: LeaveRequest[] = JSON.parse(local);
      const updated = currentList.map((item: LeaveRequest) => {
        if (item._id === leafId || item.id === leafId) {
          return { ...item, status: newStatus };
        }
        return item;
      });
      localStorage.setItem("abms_rel_teacher_leaves", JSON.stringify(updated));
      setLeaves(updated);
      setSuccessMsg(`Leave request successfully ${newStatus.toLowerCase()} (Saved locally in browser cache)!`);
    } else {
      const updated = leaves.map((item: LeaveRequest) => {
        if (item._id === leafId || item.id === leafId) {
          return { ...item, status: newStatus };
        }
        return item;
      });
      setLeaves(updated);
      localStorage.setItem("abms_rel_teacher_leaves", JSON.stringify(updated));
      setSuccessMsg(`Leave request successfully ${newStatus.toLowerCase()} (Saved locally in browser cache)!`);
    }
    setIsProcessingId(null);
  };

  // Filter leaves with robust tenant matching and fallback safety
  const filteredLeaves = leaves.filter((l) => {
    if (!l) return false;

    // Filter by organization if specified for admin
    if (adminOrganizationId) {
      const targetOrg = normalizeOrgId(adminOrganizationId);
      const leafOrg = l.organization_id ? normalizeOrgId(l.organization_id) : "";

      if (leafOrg) {
        if (leafOrg !== targetOrg) {
          return false;
        }
      } else {
        const teacher = findTeacher(l.teacher_id, l.teacher_name);
        if (teacher && teacher.organization_id) {
          const teacherOrg = normalizeOrgId(teacher.organization_id);
          if (teacherOrg !== targetOrg) {
            return false;
          }
        }
        // If teacher is not found or teacher has no organization_id, keep the leave request
        // so requests posted via Postman/API for this org are shown!
      }
    }

    const normStatus = normalizeStatus(l.status);
    if (statusFilter === "All") return true;
    return normStatus === statusFilter;
  });

  // Count items
  const countByStatus = (status: "Pending" | "Approved" | "Rejected") => {
    return leaves.filter((l) => {
      if (!l) return false;
      const normStatus = normalizeStatus(l.status);
      if (normStatus !== status) return false;

      if (adminOrganizationId) {
        const targetOrg = normalizeOrgId(adminOrganizationId);
        const leafOrg = l.organization_id ? normalizeOrgId(l.organization_id) : "";

        if (leafOrg) {
          if (leafOrg !== targetOrg) return false;
        } else {
          const teacher = findTeacher(l.teacher_id, l.teacher_name);
          if (teacher && teacher.organization_id) {
            const teacherOrg = normalizeOrgId(teacher.organization_id);
            if (teacherOrg !== targetOrg) return false;
          }
        }
      }
      return true;
    }).length;
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-indigo-600 animate-pulse" />
          Manage Instructor Leaves & Absence Requests
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Review, approve, or decline time-off applications submitted by teacher faculty.
        </p>
      </div>

      {/* Messages */}
      {errorMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50/50 border border-amber-100/70 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Approvals</span>
          <h4 className="text-2xl font-bold text-amber-800 mt-1 font-mono">{countByStatus("Pending")}</h4>
        </div>
        <div className="bg-emerald-50/50 border border-emerald-100/70 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Approved Leaves</span>
          <h4 className="text-2xl font-bold text-emerald-800 mt-1 font-mono">{countByStatus("Approved")}</h4>
        </div>
        <div className="bg-rose-50/50 border border-rose-100/70 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Declined requests</span>
          <h4 className="text-2xl font-bold text-rose-800 mt-1 font-mono">{countByStatus("Rejected")}</h4>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[400px]">
        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Applications Inbox
            </h3>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              {filteredLeaves.length}
            </span>
          </div>

          {/* Tab Filter buttons */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/60 flex items-center gap-1">
            {(["Pending", "Approved", "Rejected", "All"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === filter
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Leaves List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <span className="text-xs font-semibold">Compiling all teachers leave requests...</span>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
              <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
              <h4 className="text-xs font-bold text-slate-700">No Leaves Match Filter</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                {statusFilter === "Pending" 
                  ? "Outstanding leave applications look fully clear!" 
                  : `No records currently marked with '${statusFilter}' status.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence initial={false}>
                {filteredLeaves.map((l, idx) => {
                  const name = getTeacherName(l);
                  const contact = getTeacherContact(l);

                  return (
                    <motion.div
                      key={l._id || l.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="border border-slate-200 hover:border-slate-300 rounded-2xl p-5 bg-slate-50/30 hover:bg-white flex flex-col justify-between gap-4 transition-all"
                    >
                      <div className="space-y-3">
                        {/* Instructor Profile Header */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate">
                                {name}
                              </h4>
                              {contact && (
                                <p className="text-[10px] text-slate-400 truncate font-semibold font-mono">
                                  {contact}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Leave Type Label */}
                          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0">
                            {l.leave_type}
                          </span>
                        </div>

                        {/* Date info banner */}
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 font-semibold bg-slate-100 p-2 rounded-xl border border-slate-200/50 w-full sm:w-fit">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{l.leave_date}</span>
                          <span className="text-slate-300">to</span>
                          <span>{l.end_date}</span>
                        </div>

                        {/* Reason quote */}
                        <p className="bg-slate-50/50 border border-slate-200/40 rounded-xl p-3 text-slate-600 leading-relaxed text-[11px] italic">
                          "{l.reason}"
                        </p>
                      </div>

                      {/* Decision Controls Panel */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-1 gap-4">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                          <Info className="w-3 h-3" />
                          <span>Filed {new Date(l.created_at).toLocaleDateString()}</span>
                        </div>

                        {l.status === "Pending" ? (
                          <div className="flex items-center gap-2">
                            {/* Reject Button */}
                            <button
                              onClick={() => handleUpdateStatus(l._id || l.id || "", "Rejected")}
                              disabled={isProcessingId === (l._id || l.id)}
                              className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              Decline
                            </button>
                            
                            {/* Approve Button */}
                            <button
                              onClick={() => handleUpdateStatus(l._id || l.id || "", "Approved")}
                              disabled={isProcessingId === (l._id || l.id)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
                            >
                              {isProcessingId === (l._id || l.id) ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Approve
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold">
                            <span className="text-slate-400">Current Status:</span>
                            <span className={`px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                              l.status === "Approved" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                : "bg-rose-50 text-rose-700 border-rose-100"
                            }`}>
                              {l.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
