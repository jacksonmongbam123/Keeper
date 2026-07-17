import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  Clock, 
  Info, 
  AlertCircle, 
  Inbox, 
  User,
  Users,
  GraduationCap,
  Loader2,
  Check
} from "lucide-react";

interface HeaderNotificationsDropdownProps {
  token: string;
  classSectionsList: any[];
  userDirectory: any[];
  currentUserId: string;
  organizationId?: string;
}

export default function HeaderNotificationsDropdown({
  token,
  classSectionsList = [],
  userDirectory = [],
  currentUserId = "",
  organizationId
}: HeaderNotificationsDropdownProps) {
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  // Load seen state from localstorage to track "unread" notifications
  const [seenIds, setSeenIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("abms_notifications_seen");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg("");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      };
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

          // Check if there are notifications not yet seen
          const unseen = orgFiltered.some((notif: any) => notif._id && !seenIds.includes(notif._id));
          setHasNewNotifications(unseen);
        } else {
          setNotificationsList([]);
        }
      }
    } catch (err: any) {
      console.error("Error fetching header notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for real-time notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Update seen list when opening dropdown
  const handleOpenToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && notificationsList.length > 0) {
      // Mark all current as seen
      const allIds = notificationsList.map((n: any) => n._id).filter(Boolean);
      const updatedSeen = Array.from(new Set([...seenIds, ...allIds]));
      setSeenIds(updatedSeen);
      localStorage.setItem("abms_notifications_seen", JSON.stringify(updatedSeen));
      setHasNewNotifications(false);
    }
  };

  // Helper: Format recipient metadata
  const getTargetMeta = (notif: any) => {
    const type = String(notif.target_type || "").toLowerCase();
    
    if (type === "teachers" || type === "all_teachers") {
      return {
        label: "Staff Only",
        style: "bg-emerald-50 text-emerald-700 border-emerald-100",
        icon: User
      };
    }
    
    if (type === "class_section") {
      const cs = classSectionsList.find(c => c._id === notif.target_class_id || c.id === notif.target_class_id);
      const className = cs ? `${cs.class || cs.grade} - ${cs.__section || cs.section || ""}` : "Cohort";
      return {
        label: `${className}`,
        style: "bg-cyan-50 text-cyan-700 border-cyan-100",
        icon: GraduationCap
      };
    }
    
    if (type === "parents_of_student") {
      return {
        label: "Parents",
        style: "bg-purple-50 text-purple-700 border-purple-100",
        icon: Users
      };
    }

    return {
      label: "Broadcast",
      style: "bg-slate-100 text-slate-700 border-slate-200/80",
      icon: Users
    };
  };

  return (
    <div className="relative">
      {/* Trigger Bell Button */}
      <button
        onClick={handleOpenToggle}
        className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
          isOpen
            ? "bg-slate-100 border-slate-300 text-indigo-600 shadow-inner"
            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 shadow-xs"
        }`}
        title="Notifications"
      >
        <Bell className={`w-4 h-4 ${hasNewNotifications ? "animate-pulse" : ""}`} />
        {hasNewNotifications && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        )}
      </button>

      {/* Floating Panel Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop click closer */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Dropdown Card */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 w-80 md:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50 flex flex-col max-h-[480px]"
            >
              {/* Header */}
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    School Bulletins
                  </span>
                </div>
                {hasNewNotifications && (
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                    New Notices
                  </span>
                )}
              </div>

              {/* Bulletins List Container */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1.5 space-y-1">
                {isLoading && notificationsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                    <p className="text-[11px] font-semibold text-slate-500">Syncing bulletins...</p>
                  </div>
                ) : notificationsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-4">
                    <Inbox className="w-8 h-8 text-slate-300 mb-2" />
                    <h4 className="text-xs font-bold text-slate-700">All Caught Up</h4>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">
                      There are no active broadcasts or memos posted on the bulletins directory.
                    </p>
                  </div>
                ) : (
                  notificationsList.map((notif, idx) => {
                    const meta = getTargetMeta(notif);
                    const Icon = meta.icon;
                    const isNew = notif._id && !seenIds.includes(notif._id);

                    return (
                      <div
                        key={notif._id || idx}
                        className={`p-3 rounded-xl transition-colors flex flex-col gap-1.5 text-left border ${
                          isNew 
                            ? "bg-slate-50/50 border-slate-200" 
                            : "bg-transparent border-transparent"
                        } hover:bg-slate-50/70`}
                      >
                        {/* Meta Tags Row */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${meta.style}`}>
                            <Icon className="w-2.5 h-2.5" />
                            {meta.label}
                          </span>
                          
                          <span className="text-[9px] font-semibold text-slate-400">
                            {notif.date 
                              ? new Date(notif.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                              : "Recent"}
                          </span>
                        </div>

                        {/* Title & Msg */}
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 leading-snug">
                            {notif.title}
                          </h5>
                          <p className="text-[11px] text-slate-600 leading-relaxed mt-1 line-clamp-3">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-medium">
                <span>Official Communications Channel</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
