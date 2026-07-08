import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  Search, 
  Clock, 
  Info, 
  AlertCircle, 
  Mail, 
  Inbox, 
  Megaphone,
  User,
  Users,
  GraduationCap,
  Calendar,
  Loader2,
  RefreshCw
} from "lucide-react";

interface TeacherNotificationsViewProps {
  token: string;
  classSectionsList: any[];
  userDirectory: any[];
  organizationId?: string;
  currentUserId?: string;
}

export default function TeacherNotificationsView({
  token,
  classSectionsList = [],
  userDirectory = [],
  organizationId,
  currentUserId = ""
}: TeacherNotificationsViewProps) {
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "teachers_only">("all");

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/m/notification/retrieve", {
        method: "POST",
        headers,
        body: JSON.stringify({})
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Sort notifications so latest comes first
          const sorted = data.filter(Boolean).sort((a: any, b: any) => {
            const dateA = new Date(a.date || a.createdAt || 0).getTime();
            const dateB = new Date(b.date || b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          // Filter by organization with robust normalization and tenant safety
          const normalizeOrgId = (id: any): string => {
            if (!id) return "";
            const idStr = String(id).trim().toLowerCase();
            if (idStr === "6a489ad4de9f134ee6c3b5ef") {
              return "6a48a06fde9f134ee6c3d763";
            }
            return idStr;
          };

          const targetOrgNormalized = normalizeOrgId(organizationId || userDirectory.find((u: any) => u && (u._id === currentUserId || u.id === currentUserId))?.organization_id);
          
          const orgFiltered = sorted.filter((notif: any) => {
            if (!notif) return false;
            if (targetOrgNormalized) {
              const notifOrg = notif.organization_id ? normalizeOrgId(notif.organization_id) : "";
              if (notifOrg && notifOrg !== targetOrgNormalized) {
                return false;
              }
              if (!notifOrg) {
                const sender = userDirectory.find((u: any) => u && (u._id === notif.sender_id || u.id === notif.sender_id));
                if (sender) {
                  const senderOrg = sender.organization_id ? normalizeOrgId(sender.organization_id) : "";
                  if (senderOrg && senderOrg !== targetOrgNormalized) {
                    return false;
                  }
                }
              }
            }
            return true;
          });
          setNotificationsList(orgFiltered);
        } else {
          setNotificationsList([]);
        }
      } else {
        setErrorMsg("Failed to retrieve system broadcast records.");
      }
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setErrorMsg("Network error: Could not fetch announcements.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  // Map Recipient Label and Theme Class
  const getTargetMeta = (notif: any) => {
    const type = String(notif.target_type || "").toLowerCase();
    
    if (type === "teachers" || type === "all_teachers") {
      return {
        label: "All Teachers",
        style: "bg-emerald-50 text-emerald-700 border-emerald-100",
        icon: User
      };
    }
    
    if (type === "class_section") {
      const cs = classSectionsList.find(c => c._id === notif.target_class_id || c.id === notif.target_class_id);
      const className = cs ? `${cs.grade} - ${cs.__section || cs.section || ""}` : "Class Section";
      return {
        label: `Cohort: ${className}`,
        style: "bg-cyan-50 text-cyan-700 border-cyan-100",
        icon: GraduationCap
      };
    }
    
    if (type === "parents_of_student") {
      const studentsList = userDirectory.filter((u: any) => u && u.role === "student");
      const stud = studentsList.find(s => s._id === notif.target_student_id || s.id === notif.target_student_id);
      const studentName = stud ? stud.name : "Specific Student";
      return {
        label: `Parents of: ${studentName}`,
        style: "bg-purple-50 text-purple-700 border-purple-100",
        icon: Users
      };
    }

    return {
      label: "All Students",
      style: "bg-slate-100 text-slate-700 border-slate-200",
      icon: Users
    };
  };

  // Filter & Search Logic
  const filteredNotifications = notificationsList.filter((notif) => {
    const matchesSearch = 
      (notif.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (notif.message || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === "teachers_only") {
      const type = String(notif.target_type || "").toLowerCase();
      return type === "teachers" || type === "all_teachers";
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-indigo-600 animate-bounce" />
            School Announcements & Notifications
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access administrative broad bulletins, target circulars, and official staff notices.
          </p>
        </div>

        <button
          onClick={fetchNotifications}
          disabled={isLoading}
          className="self-start md:self-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200/80"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          Refresh Bulletins
        </button>
      </div>

      {/* Message banners */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab Filters */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/60 flex items-center gap-1 self-start">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            All Announcements
          </button>
          <button
            onClick={() => setActiveFilter("teachers_only")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === "teachers_only"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            Teachers Bulletin ({notificationsList.filter(n => String(n.target_type || "").toLowerCase() === "teachers" || String(n.target_type || "").toLowerCase() === "all_teachers").length})
          </button>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2 max-w-md w-full bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search bulletins by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs focus:outline-none text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Notifications List Container */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold text-slate-500">Querying bulletin database...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-4">
          <div className="bg-slate-50 p-4 rounded-full border border-slate-100">
            <Mail className="w-10 h-10 text-slate-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-700">No Announcements Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery 
                ? "We couldn't find any announcements matching your current search query keyword."
                : "There are currently no active administrative broadcasts posted in this bulletin directory."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((notif, idx) => {
              const meta = getTargetMeta(notif);
              const IconComp = meta.icon;

              return (
                <motion.div
                  key={notif._id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    {/* Meta recipient & Date Row */}
                    <div className="flex items-center justify-between gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border ${meta.style}`}>
                        <IconComp className="w-3 h-3" />
                        {meta.label}
                      </span>
                      
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        <span>
                          {notif.date 
                            ? new Date(notif.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                            : "Recent"}
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 leading-snug">
                        {notif.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
                        {notif.message}
                      </p>
                    </div>
                  </div>

                  {/* Footer metadata */}
                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Sender: Administrative Desk</span>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Info className="w-3 h-3 text-slate-300" />
                      <span>Official Broadcast</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
