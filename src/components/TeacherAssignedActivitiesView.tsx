import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Briefcase, 
  Award, 
  Clock, 
  Loader2, 
  Sparkles,
  Info,
  Calendar,
  BookOpen,
  UserCheck
} from "lucide-react";

interface TeacherAssignedActivitiesViewProps {
  token: string;
  currentUserId: string;
}

export default function TeacherAssignedActivitiesView({
  token,
  currentUserId
}: TeacherAssignedActivitiesViewProps) {
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [activityPositions, setActivityPositions] = useState<any[]>([]);
  const [assignedActivities, setAssignedActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helper: Get Activity Type Name
  const getTypeName = (typeId: string) => {
    const type = activityTypes.find(t => t && (t._id === typeId || t.id === typeId));
    return type ? type.name : typeId || "Unknown Type";
  };

  // Helper: Get Activity Position Name
  const getPositionName = (posId: string) => {
    const pos = activityPositions.find(p => p && (p._id === posId || p.id === posId));
    return pos ? pos.name : posId || "Unknown Position";
  };

  // 1. Fetch Activity Types
  const fetchActivityTypes = async () => {
    try {
      const res = await fetch("/df/extraActivityType/retrieve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setActivityTypes(data.filter(Boolean));
          return;
        }
      }
    } catch (err) {
      console.warn("API extraActivityType fetch error, using fallback:", err);
    }
    
    // Fallback list
    const local = localStorage.getItem("abms_df_extra_activity_type");
    if (local) {
      setActivityTypes(JSON.parse(local));
    } else {
      const defaults = [
        { _id: "act_type_1", id: "act_type_1", name: "Sports & Athletics" },
        { _id: "act_type_2", id: "act_type_2", name: "Music & Performing Arts" },
        { _id: "act_type_3", id: "act_type_3", name: "Debate & Public Speaking" },
        { _id: "act_type_4", id: "act_type_4", name: "Drama & Theater" },
        { _id: "act_type_5", id: "act_type_5", name: "Science & Robotics Club" },
        { _id: "act_type_6", id: "act_type_6", name: "Chess & Board Games" },
        { _id: "act_type_7", id: "act_type_7", name: "Student Council & Leadership" }
      ];
      setActivityTypes(defaults);
      localStorage.setItem("abms_df_extra_activity_type", JSON.stringify(defaults));
    }
  };

  // 2. Fetch Activity Positions
  const fetchActivityPositions = async () => {
    try {
      let res = await fetch("/df/extraActivityPositions/retrieve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      
      if (!res.ok) {
        res = await fetch("/df/extraActivityPiaitions/retrieve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({})
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setActivityPositions(data.filter(Boolean));
          return;
        }
      }
    } catch (err) {
      console.warn("API extraActivityPositions fetch error, using fallback:", err);
    }
    
    // Fallback list
    const local = localStorage.getItem("abms_df_extra_activity_positions");
    if (local) {
      setActivityPositions(JSON.parse(local));
    } else {
      const defaults = [
        { _id: "act_pos_1", id: "act_pos_1", name: "Head Coach" },
        { _id: "act_pos_2", id: "act_pos_2", name: "Assistant Coach" },
        { _id: "act_pos_3", id: "act_pos_3", name: "Chief Instructor" },
        { _id: "act_pos_4", id: "act_pos_4", name: "Teacher Coordinator" },
        { _id: "act_pos_5", id: "act_pos_5", name: "Staff Patron" },
        { _id: "act_pos_6", id: "act_pos_6", name: "Technical Advisor" },
        { _id: "act_pos_7", id: "act_pos_7", name: "Supervisor" }
      ];
      setActivityPositions(defaults);
      localStorage.setItem("abms_df_extra_activity_positions", JSON.stringify(defaults));
    }
  };

  // 3. Fetch Assigned Extra Activities
  const fetchRelations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/rel/teacherExtraActivity/retrieve", {
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
          // Filter to only current teacher's activities
          const filtered = data.filter((item: any) => item && (item.teacher_id === currentUserId || item.teacher === currentUserId));
          setAssignedActivities(filtered);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("API teacherExtraActivity fetch error, using fallback:", err);
    }
    
    // Fallback list
    const local = localStorage.getItem("abms_rel_teacher_extra_activity");
    if (local) {
      const all = JSON.parse(local);
      const filtered = all.filter((item: any) => item && (item.teacher_id === currentUserId || item.teacher === currentUserId));
      setAssignedActivities(filtered);
    } else {
      setAssignedActivities([]);
    }
    setIsLoading(false);
  };

  // Load everything on mount
  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([
        fetchActivityTypes(),
        fetchActivityPositions(),
        fetchRelations()
      ]);
    };
    loadAll();
  }, [token, currentUserId]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
          <Briefcase className="w-5 h-5 text-indigo-600 animate-pulse" />
          My Co-Curricular & Extra Activities
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          View school co-curricular clubs, sports, and specialized extra activity positions assigned to you by the administration.
        </p>
      </div>

      {/* Main Grid: Statistics and List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Statistics & Overview Cards */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <UserCheck className="w-4.5 h-4.5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Assigned Overview
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-indigo-50/50 border border-indigo-100/70 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Total Mapped Roles</span>
                <span className="text-3xl font-black text-indigo-900 font-mono mt-1 block">
                  {assignedActivities.length}
                </span>
              </div>

              <div className="text-xs text-slate-500 space-y-2 leading-relaxed bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                <div className="flex items-start gap-1.5">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>These assignments are set and managed by the institute's administration system.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Activities List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
            <BookOpen className="w-4.5 h-4.5 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Assigned Activity List
            </h3>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              {assignedActivities.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px]">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                <span className="text-xs font-semibold">Retrieving your extra-curricular assignments...</span>
              </div>
            ) : assignedActivities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
                <h4 className="text-xs font-bold text-slate-700">No Assignments Yet</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  You are currently not mapped to any extra-curricular clubs or sports activities.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {assignedActivities.map((act, idx) => (
                    <motion.div
                      key={act._id || act.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-slate-200 hover:border-slate-300 rounded-2xl p-5 bg-slate-50/40 hover:bg-white flex flex-col gap-3 transition-all"
                    >
                      {/* Top Bar: Activity Type & Badge */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                            <Award className="w-4.5 h-4.5 text-indigo-600" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">
                              {getTypeName(act.extra_activity_type_id || act.extra_activity_type)}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-semibold font-mono">
                              ID: {act._id || act.id}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold bg-indigo-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Active Status
                        </span>
                      </div>

                      {/* Info Panel: Role Position and Assignment Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 bg-white border border-slate-200/50 rounded-xl p-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Position Role</span>
                          <p className="text-xs font-bold text-slate-700">
                            {getPositionName(act.extra_activity_position_id || act.extra_activity_position)}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Date</span>
                          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {act.assigned_at ? new Date(act.assigned_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : "N/A"}
                          </p>
                        </div>
                      </div>

                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
