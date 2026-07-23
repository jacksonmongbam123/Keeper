import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Loader2, 
  Sparkles,
  Info
} from "lucide-react";

interface TeacherLeavesViewProps {
  token: string;
  currentUserId: string;
  teacherName?: string;
  organizationId?: string;
  currentUser?: any;
  userDirectory?: any[];
}

export interface LeaveRequest {
  _id?: string;
  id?: string;
  teacher_id: string;
  teacher_name?: string;
  organization_id?: string;
  leave_date: string;
  end_date: string;
  leave_type: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  created_at: string;
}

export default function TeacherLeavesView({
  token,
  currentUserId,
  teacherName,
  organizationId,
  currentUser,
  userDirectory
}: TeacherLeavesViewProps) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Messages
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form Fields
  const [leaveDate, setLeaveDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [reason, setReason] = useState("");

  // Helper: Match if a leave request belongs to the current teacher across all identifier variants
  const isTeacherMatch = (l: LeaveRequest) => {
    if (!l) return false;

    const leaveTeacherId = String(l.teacher_id || "").trim().toLowerCase();
    const leaveTeacherName = String(l.teacher_name || "").trim().toLowerCase();

    // Collect all possible teacher identifiers & names in lowercase
    const idsToCheck = new Set<string>();
    const namesToCheck = new Set<string>();

    const addIdentities = (u: any) => {
      if (!u) return;
      if (u._id) idsToCheck.add(String(u._id).trim().toLowerCase());
      if (u.id) idsToCheck.add(String(u.id).trim().toLowerCase());
      if (u.user_id) idsToCheck.add(String(u.user_id).trim().toLowerCase());
      if (u.teacher_id) idsToCheck.add(String(u.teacher_id).trim().toLowerCase());
      if (u.username) idsToCheck.add(String(u.username).trim().toLowerCase());
      if (u.email) {
        const em = String(u.email).trim().toLowerCase();
        idsToCheck.add(em);
        if (em.includes("@")) {
          idsToCheck.add(em.split("@")[0]);
        }
      }
      if (u.nic) idsToCheck.add(String(u.nic).trim().toLowerCase());
      if (u.employee_id) idsToCheck.add(String(u.employee_id).trim().toLowerCase());
      if (u.regNo || u.reg_no) idsToCheck.add(String(u.regNo || u.reg_no).trim().toLowerCase());

      const first = u.first_name || "";
      const last = u.last_name || "";
      const full = `${first} ${last}`.trim().toLowerCase();
      if (full) namesToCheck.add(full);
      if (u.name) namesToCheck.add(String(u.name).trim().toLowerCase());
      if (u.username) namesToCheck.add(String(u.username).trim().toLowerCase());
    };

    if (currentUserId) {
      const cid = String(currentUserId).trim().toLowerCase();
      idsToCheck.add(cid);
      if (cid.includes("@")) idsToCheck.add(cid.split("@")[0]);
    }
    if (teacherName) {
      namesToCheck.add(String(teacherName).trim().toLowerCase());
    }

    addIdentities(currentUser);

    try {
      const savedSession = JSON.parse(localStorage.getItem("abms_session") || "{}")?.data?.user;
      addIdentities(savedSession);
    } catch (e) {
      // ignore
    }

    if (userDirectory && Array.isArray(userDirectory)) {
      const foundTeacher = userDirectory.find((u: any) => {
        if (!u) return false;
        const uId = String(u._id || u.id || u.user_id || u.teacher_id || "").trim().toLowerCase();
        const uEmail = String(u.email || "").trim().toLowerCase();
        const uUsername = String(u.username || "").trim().toLowerCase();
        if (idsToCheck.has(uId) || idsToCheck.has(uEmail) || idsToCheck.has(uUsername)) return true;
        const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase();
        if (fullName && namesToCheck.has(fullName)) return true;
        return false;
      });
      if (foundTeacher) {
        addIdentities(foundTeacher);
      }
    }

    // 1. Check ID / username / email match
    if (leaveTeacherId) {
      if (idsToCheck.has(leaveTeacherId)) return true;
      if (leaveTeacherId.includes("@") && idsToCheck.has(leaveTeacherId.split("@")[0])) return true;
    }

    // 2. Check Name match
    if (leaveTeacherName) {
      for (const n of namesToCheck) {
        if (!n) continue;
        if (leaveTeacherName === n || leaveTeacherName.includes(n) || n.includes(leaveTeacherName)) {
          return true;
        }
      }
    }

    // 3. Check Organization match if teacher name tokens partially match
    if (organizationId && l.organization_id) {
      const targetOrg = String(organizationId).trim().toLowerCase();
      const leafOrg = String(l.organization_id).trim().toLowerCase();
      if (leafOrg === targetOrg && leaveTeacherName && namesToCheck.size > 0) {
        const leaveWords = leaveTeacherName.split(/\s+/).filter(Boolean);
        for (const n of namesToCheck) {
          const userWords = n.split(/\s+/).filter(Boolean);
          if (leaveWords.some(lw => userWords.some(uw => lw === uw && lw.length > 2))) {
            return true;
          }
        }
      }
    }

    return false;
  };

  // 1. Fetch Teacher Leaves
  const fetchLeaves = async () => {
    setIsLoading(true);
    let fetchedData: LeaveRequest[] = [];

    try {
      const res = await fetch("/rel/teacherLeave/retrieve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          fetchedData = data.filter(Boolean);
        }
      }
    } catch (err) {
      console.warn("API leaf retrieval error, loading from local cache:", err);
    }

    // Merge with local storage
    const local = localStorage.getItem("abms_rel_teacher_leaves");
    const localList: LeaveRequest[] = local ? JSON.parse(local) : [];

    const map = new Map<string, LeaveRequest>();
    fetchedData.forEach((item) => {
      const key = String(item._id || item.id || Math.random());
      map.set(key, item);
    });
    localList.forEach((item) => {
      const key = String(item._id || item.id || "");
      if (key && !map.has(key)) {
        map.set(key, item);
      }
    });

    const combined = Array.from(map.values());
    const filtered = combined.filter(isTeacherMatch);

    setLeaves(filtered);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLeaves();
  }, [token, currentUserId]);

  // Handle request submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDate || !endDate || !reason.trim()) {
      setErrorMsg("Please fill in all the required fields.");
      return;
    }

    // Date validation
    if (new Date(leaveDate) > new Date(endDate)) {
      setErrorMsg("Leave start date cannot be after the end date.");
      return;
    }

    if (!currentUserId) {
      setErrorMsg("Error: Your Teacher User ID is missing or could not be identified. Please try logging out and logging back in.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const payload: LeaveRequest = {
      teacher_id: currentUserId,
      teacher_name: teacherName || "Instructor",
      organization_id: organizationId,
      leave_date: leaveDate,
      end_date: endDate,
      leave_type: leaveType,
      reason: reason.trim(),
      status: "Pending",
      created_at: new Date().toISOString()
    };

    let apiSucceeded = false;
    let apiErrorMsg = "";

    try {
      const res = await fetch("/rel/teacherLeave/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSuccessMsg("Your leave request has been submitted and stored in MongoDB database successfully!");
        setReason("");
        setLeaveDate("");
        setEndDate("");
        await fetchLeaves();
        setIsSubmitting(false);
        return;
      } else {
        const errData = await res.json().catch(() => ({}));
        apiErrorMsg = errData.message || errData.error || `Server responded with status ${res.status}`;
      }
    } catch (err: any) {
      console.warn("API leaf submission failed, falling back to local cache:", err);
      apiErrorMsg = err.message || "Network connection failure";
    }

    // If API returned a failure (e.g. status 400 or 500) rather than a network disconnect,
    // let's show the actual error instead of silently using local storage fallback.
    if (apiErrorMsg && apiErrorMsg !== "Failed to fetch" && !apiErrorMsg.includes("Network")) {
      setErrorMsg(`API Submission Failed: ${apiErrorMsg}`);
      setIsSubmitting(false);
      return;
    }

    // Fallback Local Storage Save (only on offline network failures)
    const local = localStorage.getItem("abms_rel_teacher_leaves");
    const currentList: LeaveRequest[] = local ? JSON.parse(local) : [];
    
    const newRecord: LeaveRequest = {
      _id: "leaf_" + Math.random().toString(36).substr(2, 9),
      id: "leaf_" + Math.random().toString(36).substr(2, 9),
      ...payload
    };

    const updated = [newRecord, ...currentList];
    localStorage.setItem("abms_rel_teacher_leaves", JSON.stringify(updated));
    
    setSuccessMsg("Your leave request has been successfully submitted (Offline fallback mode: Saved locally in browser cache)!");
    setReason("");
    setLeaveDate("");
    setEndDate("");
    
    // Refresh state
    setLeaves(updated.filter(isTeacherMatch));
    setIsSubmitting(false);
  };

  // Status Badge Class Selector
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-amber-50 text-amber-700 border-amber-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-indigo-600 animate-pulse" />
          Request Leave & Time Off
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Submit professional leave applications and review your active real-time approval status.
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
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form Panel: Leave request builder */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Submit Leave Request
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Leave Type Select */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Type of Leave
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 cursor-pointer"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave / Medical</option>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
              </select>
            </div>

            {/* Date Picker Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Start Date
                </label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                />
              </div>
            </div>

            {/* Reason Text Area */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Reason for Leave
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Describe your reason for requesting leave (e.g. personal emergency, dentist appointment, unwell)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 placeholder-slate-400 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/15 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Submit Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: My Leave History List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
            <Clock className="w-4.5 h-4.5 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Leave Applications History
            </h3>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              {leaves.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[480px]">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                <span className="text-xs font-semibold">Retrieving leave applications...</span>
              </div>
            ) : leaves.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
                <h4 className="text-xs font-bold text-slate-700">No Applications Lodged</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  You have not submitted any leave or time off requests. Submissions made via the builder panel on the left will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaves.map((l, idx) => (
                  <motion.div
                    key={l._id || l.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-slate-200/80 hover:border-slate-300 rounded-xl p-4 flex flex-col gap-3 bg-slate-50/40 transition-all"
                  >
                    {/* Top Row: Type & Status */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                        {l.leave_type}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(l.status)}`}>
                        {l.status}
                      </span>
                    </div>

                    {/* Middle Row: Date Range & Description */}
                    <div className="text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 font-semibold bg-slate-100/70 p-2 rounded-lg w-fit border border-slate-200/40">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{l.leave_date}</span>
                        <span className="text-slate-300">to</span>
                        <span>{l.end_date}</span>
                      </div>
                      
                      <p className="bg-white border border-slate-200/50 rounded-xl p-3 text-slate-600 leading-relaxed text-[11px] italic">
                        "{l.reason}"
                      </p>
                    </div>

                    {/* Footer / Info */}
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-2.5">
                      <div className="flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        <span>Submitted {new Date(l.created_at).toLocaleDateString()}</span>
                      </div>
                      {l.status === "Pending" && (
                        <span className="text-amber-600 animate-pulse">Awaiting Administration review</span>
                      )}
                      {l.status === "Approved" && (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Approved
                        </span>
                      )}
                      {l.status === "Rejected" && (
                        <span className="text-rose-600 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Declined
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
