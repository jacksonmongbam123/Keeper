import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Briefcase, 
  Award, 
  User, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  Sparkles,
  Search,
  BookOpen
} from "lucide-react";

interface AssignExtraActivitiesViewProps {
  token: string;
  userDirectory: any[];
}

export default function AssignExtraActivitiesView({
  token,
  userDirectory = []
}: AssignExtraActivitiesViewProps) {
  // Lists
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [activityPositions, setActivityPositions] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  
  // Loading & Message States
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form selections
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  
  // Search state for roster
  const [rosterSearch, setRosterSearch] = useState("");

  // Filter out instructors/teachers
  const teachersList = userDirectory.filter(
    (u: any) => u && String(u.role).toLowerCase() === "instructor"
  );

  // Helper: Format teacher name
  const getTeacherName = (teacherId: string) => {
    if (!teacherId) return "No teacher assigned";
    const t = userDirectory.find((u: any) => u && (u._id === teacherId || u.id === teacherId));
    if (!t) return "Unknown Instructor";
    const first = t.first_name || "";
    const last = t.last_name || "";
    return `${first} ${last}`.trim() || t.username || "Instructor";
  };

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
          setRelations(data.filter(Boolean));
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
      setRelations(JSON.parse(local));
    } else {
      setRelations([]);
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
  }, [token]);

  // Set default form selections when list loads
  useEffect(() => {
    if (teachersList.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(teachersList[0]._id || teachersList[0].id);
    }
    if (activityTypes.length > 0 && !selectedTypeId) {
      setSelectedTypeId(activityTypes[0]._id || activityTypes[0].id);
    }
    if (activityPositions.length > 0 && !selectedPositionId) {
      setSelectedPositionId(activityPositions[0]._id || activityPositions[0].id);
    }
  }, [teachersList, activityTypes, activityPositions]);

  // Handle Form Submit
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !selectedTypeId || !selectedPositionId) {
      setErrorMsg("Please ensure all fields are selected before assigning.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const payload = {
      teacher_id: selectedTeacherId,
      extra_activity_type_id: selectedTypeId,
      extra_activity_position_id: selectedPositionId,
      assigned_at: new Date().toISOString(),
      is_active: true
    };

    try {
      const res = await fetch("/rel/teacherExtraActivity/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSuccessMsg("Activity assigned successfully to the instructor!");
        await fetchRelations();
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn("API extra activity assignment failed, saving locally:", err);
    }

    // Fallback local storage save
    const local = localStorage.getItem("abms_rel_teacher_extra_activity");
    const current = local ? JSON.parse(local) : [];
    
    // Check if duplicate assignment exists locally
    const isDuplicate = current.some((r: any) => 
      r.teacher_id === selectedTeacherId && 
      r.extra_activity_type_id === selectedTypeId && 
      r.extra_activity_position_id === selectedPositionId
    );

    if (isDuplicate) {
      setErrorMsg("This instructor is already assigned to this activity in this position!");
      setIsSubmitting(false);
      return;
    }

    const newRecord = {
      _id: "rel_act_" + Math.random().toString(36).substr(2, 9),
      id: "rel_act_" + Math.random().toString(36).substr(2, 9),
      ...payload
    };
    
    const updated = [...current, newRecord];
    localStorage.setItem("abms_rel_teacher_extra_activity", JSON.stringify(updated));
    setRelations(updated);
    setSuccessMsg("Activity assigned successfully (cached locally)!");
    setIsSubmitting(false);
  };

  // Handle Delete Relation
  const handleDelete = async (id: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/rel/teacherExtraActivity/delete/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setSuccessMsg("Assignment removed successfully!");
        await fetchRelations();
        return;
      }
    } catch (err) {
      console.warn("API assignment removal failed, deleting locally:", err);
    }

    // Fallback local storage delete
    const local = localStorage.getItem("abms_rel_teacher_extra_activity");
    if (local) {
      const current = JSON.parse(local);
      const updated = current.filter((r: any) => r._id !== id && r.id !== id);
      localStorage.setItem("abms_rel_teacher_extra_activity", JSON.stringify(updated));
      setRelations(updated);
      setSuccessMsg("Assignment removed successfully!");
    }
  };

  // Filtered relations based on search
  const filteredRelations = relations.filter(rel => {
    if (!rel) return false;
    const name = getTeacherName(rel.teacher_id).toLowerCase();
    const type = getTypeName(rel.extra_activity_type_id).toLowerCase();
    const pos = getPositionName(rel.extra_activity_position_id).toLowerCase();
    const query = rosterSearch.toLowerCase();
    return name.includes(query) || type.includes(query) || pos.includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-indigo-600 animate-pulse" />
            Co-Curricular & Extra Activities Assignment
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Map school activities and specialized co-curricular positions to faculty instructors.
          </p>
        </div>
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

      {/* Main Grid: Assign Activity Builder & Assigned Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Assign Activity Builder Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Award className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Assignment Builder
            </h3>
          </div>

          <form onSubmit={handleAssign} className="space-y-4">
            {/* Instructor Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Select Instructor / Teacher
              </label>
              {teachersList.length === 0 ? (
                <div className="text-xs text-slate-400 italic bg-slate-50 border border-slate-100 rounded-xl p-3">
                  No instructors available in directory.
                </div>
              ) : (
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 cursor-pointer"
                >
                  {teachersList.map((t: any) => (
                    <option key={t._id || t.id} value={t._id || t.id}>
                      {getTeacherName(t._id || t.id)} ({t.username || t.email || "Instructor"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Extra Activity Type Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                Extra Activity Type
              </label>
              {activityTypes.length === 0 ? (
                <div className="text-xs text-slate-400 italic bg-slate-50 border border-slate-100 rounded-xl p-3">
                  Loading activity types...
                </div>
              ) : (
                <select
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 cursor-pointer"
                >
                  {activityTypes.map((t: any) => (
                    <option key={t._id || t.id} value={t._id || t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Extra Activity Position Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                Extra Activity Position
              </label>
              {activityPositions.length === 0 ? (
                <div className="text-xs text-slate-400 italic bg-slate-50 border border-slate-100 rounded-xl p-3">
                  Loading activity positions...
                </div>
              ) : (
                <select
                  value={selectedPositionId}
                  onChange={(e) => setSelectedPositionId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 cursor-pointer"
                >
                  {activityPositions.map((p: any) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || teachersList.length === 0}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/15 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Assigning Activity...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Assign Activity
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Active Activity Mappings Roster */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Assigned Activities Roster
              </h3>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                {filteredRelations.length}
              </span>
            </div>

            {/* Roster Search bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search teacher, activity or position..."
                className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-700 placeholder-slate-400 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Roster List */}
          <div className="flex-1 overflow-y-auto max-h-[450px]">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                <span className="text-xs font-semibold">Retrieving assigned co-curricular mappings...</span>
              </div>
            ) : filteredRelations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
                <h4 className="text-xs font-bold text-slate-700">No Activity Mappings Found</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  {rosterSearch ? "No active assignments match your search filter." : "Start by mapping a faculty instructor to an activity type & role position on the left builder panel."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {filteredRelations.map((rel, idx) => (
                    <motion.div
                      key={rel._id || rel.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="group bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 hover:border-slate-300 rounded-xl p-4 flex items-center justify-between gap-4 transition-all"
                    >
                      {/* Mapping details */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">
                            {getTeacherName(rel.teacher_id)}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] font-semibold">
                            <span className="bg-indigo-100/70 text-indigo-800 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {getTypeName(rel.extra_activity_type_id)}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-md">
                              {getPositionName(rel.extra_activity_position_id)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(rel._id || rel.id)}
                        className="p-2 hover:bg-rose-50 border border-slate-200/50 hover:border-rose-100 text-slate-400 hover:text-rose-600 rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                        title="Remove Activity Assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
