import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  AlertCircle, 
  Loader2,
  Filter,
  Users
} from "lucide-react";

interface ViewTimetableViewProps {
  token: string;
  classSectionsList: any[];
  subjectsList: any[];
  userDirectory: any[];
  currentUserId: string;
  organizationId?: string;
  studentClassRelations?: any[];
  teacherSubjectClasses?: any[];
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export default function ViewTimetableView({
  token,
  classSectionsList = [],
  subjectsList = [],
  userDirectory = [],
  currentUserId = "",
  organizationId,
  studentClassRelations = [],
  teacherSubjectClasses = []
}: ViewTimetableViewProps) {
  // App states
  const [selectedClassId, setSelectedClassId] = useState("");
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Filter state: "all" or "mine"
  const [filterType, setFilterType] = useState<"all" | "mine">("mine");

  // Helper: Format teacher name beautifully
  const getTeacherName = (teacherId: string) => {
    if (!teacherId) return "No teacher assigned";
    if (teacherId === currentUserId) return "You (Assigned)";
    const t = userDirectory.find((u: any) => u && (u._id === teacherId || u.id === teacherId));
    if (!t) return "Unknown Teacher";
    const first = t.first_name || "";
    const last = t.last_name || "";
    return `${first} ${last}`.trim() || t.username || "Instructor";
  };

  // Helper: Format organization ID
  const normalizeOrgId = (id: any): string => {
    if (!id) return "";
    const idStr = String(id).trim().toLowerCase();
    if (idStr === "6a489ad4de9f134ee6c3b5ef") {
      return "6a48a06fde9f134ee6c3d763";
    }
    return idStr;
  };

  // Dynamically resolve all class sections that have active students or teachers in our organization's userDirectory
  const classIdsInOrg = new Set<string>();

  const studentsList = userDirectory.filter((u: any) => u && String(u.role).toLowerCase() === "student");
  const studentIds = new Set(studentsList.map((s: any) => s._id || s.id));
  if (Array.isArray(studentClassRelations)) {
    studentClassRelations.forEach((rel: any) => {
      if (rel && rel.class_id && (studentIds.has(rel.student_id) || studentIds.has(String(rel.student_id)))) {
        classIdsInOrg.add(rel.class_id);
      }
    });
  }

  const teachersInOrg = new Set(
    userDirectory
      .filter((u: any) => u && (String(u.role).toLowerCase() === "instructor" || String(u.role).toLowerCase() === "teacher"))
      .map((t: any) => t._id || t.id)
  );
  if (Array.isArray(teacherSubjectClasses)) {
    teacherSubjectClasses.forEach((tsc: any) => {
      if (tsc && tsc.class_id && (teachersInOrg.has(tsc.teacher_id) || teachersInOrg.has(String(tsc.teacher_id)))) {
        classIdsInOrg.add(tsc.class_id);
      }
    });
  }

  // Filter class sections to the teacher's organization scope with support for m_class_sections records lacking organization_id
  const filteredClassSections = classSectionsList.filter((cs: any) => {
    if (!cs) return false;
    if (cs.organization_id && organizationId) {
      return normalizeOrgId(cs.organization_id) === normalizeOrgId(organizationId);
    }
    return classIdsInOrg.has(cs._id || cs.id);
  });

  const allowedClassIds = new Set(filteredClassSections.map((cs: any) => cs._id || cs.id));

  // Helper: Get Class/Cohort details
  const getClassDetails = (classId: string) => {
    const cs = filteredClassSections.find(c => (c._id === classId || c.id === classId));
    if (!cs) return "N/A";
    return `${cs.grade} - ${cs.__section || cs.section || "N/A"}`;
  };

  // Fetch timetable entries for either a selected class, or all classes to filter for 'mine'
  const fetchTimetables = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      // If filtering for "mine", we need to check timetable slots across all class sections to see where this teacher is assigned.
      // Therefore, we can either make multiple fetches or a single fetch with no class_id to get all, then filter.
      // Looking at timetable_routes.js, if req.body.class_id is not passed, it queries find({}) (retrieve all)!
      // Let's verify: `if (req.body.class_id) { query.class_id = req.body.class_id; }` - yes, if omitted, it retrieves ALL!
      const bodyPayload = filterType === "all" && selectedClassId 
        ? { class_id: selectedClassId } 
        : {}; // If looking at "mine" or all, fetch all to be able to cross-reference

      const res = await fetch("https://abms-lkw9.onrender.com/timetable/retrieve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Strict organization boundaries enforcement: only allow slots for classes belonging to our organization
          // and assigned to teachers belonging to our organization to prevent cross-tenant leakage.
          let filtered = data.filter((slot: any) => {
            if (!slot) return false;
            if (!allowedClassIds.has(slot.class_id)) return false;
            
            // If the slot is assigned to a teacher, that teacher MUST belong to our organization's user directory
            if (slot.teacher_id) {
              const teacherExists = userDirectory.some((u: any) => u && (u._id === slot.teacher_id || u.id === slot.teacher_id));
              if (!teacherExists) return false;
            }
            return true;
          });
          
          if (filterType === "mine") {
            // Filter where teacher_id matches currently logged in teacher
            filtered = filtered.filter(slot => slot.teacher_id === currentUserId);
          } else if (selectedClassId) {
            // Filter by selected class (in case we fetched all, or if backend returned all)
            filtered = filtered.filter(slot => slot.class_id === selectedClassId);
          }

          // Sort chronologically by start time
          const sorted = filtered.sort((a: any, b: any) => {
            return (a.start_time || "").localeCompare(b.start_time || "");
          });
          setTimetableEntries(sorted);
        } else {
          setTimetableEntries([]);
        }
      } else {
        setTimetableEntries([]);
        setErrorMsg("Failed to retrieve timetable entries from the academic registry.");
      }
    } catch (err: any) {
      console.error("Error fetching timetable:", err);
      setErrorMsg("Network error: Could not fetch timetable.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch whenever classId or filterType changes
  useEffect(() => {
    fetchTimetables();
  }, [selectedClassId, filterType]);

  // Stats calculations
  const totalSlots = timetableEntries.length;
  const uniqueCohorts = Array.from(new Set(timetableEntries.map(s => s.class_id))).filter(Boolean);
  const cohortsCount = uniqueCohorts.length;

  const dayCounts: Record<string, number> = {};
  timetableEntries.forEach(s => {
    if (s.day) {
      const d = String(s.day).trim();
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    }
  });
  let busiestDay = "None";
  let maxSlots = 0;
  Object.entries(dayCounts).forEach(([day, count]) => {
    if (count > maxSlots) {
      maxSlots = count;
      busiestDay = day;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-cyan-600 animate-pulse" />
            My Class Timetable & Schedule
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse your assigned lecture slots, timings, classroom locations, and weekly teaching schedule.
          </p>
        </div>

        {/* Controls Panel (Right-aligned inside the header container) */}
        <div className="pt-4 border-t border-slate-100 flex justify-end items-center gap-3">
          {/* Toggle buttons: My Schedule vs Class Wise */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/60 flex items-center gap-1">
            <button
              onClick={() => {
                setFilterType("mine");
                setSelectedClassId("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterType === "mine"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              My Schedule
            </button>
            <button
              onClick={() => {
                setFilterType("all");
                // Default to first class if none selected
                if (!selectedClassId && filteredClassSections.length > 0) {
                  setSelectedClassId(filteredClassSections[0]._id || filteredClassSections[0].id);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterType === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Class Timetable
            </button>
          </div>

          {/* Conditional Class Dropdown Selector */}
          {filterType === "all" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cohort:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700 cursor-pointer"
              >
                {filteredClassSections.map((cs: any) => (
                  <option key={cs._id || cs.id} value={cs._id || cs.id}>
                    {cs.grade} - {cs.__section || cs.section || "N/A"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Stats Summary Bento Cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Weekly Lectures</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-slate-800">{totalSlots}</span>
              <span className="text-[10px] text-slate-400 font-medium">periods assigned</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Cohorts</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-cyan-700">{filterType === "mine" ? cohortsCount : filteredClassSections.length}</span>
              <span className="text-[10px] text-slate-400 font-medium">different classes</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Busiest Teaching Day</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-base font-extrabold text-slate-800 truncate block max-w-full">{busiestDay}</span>
              {maxSlots > 0 && (
                <span className="text-[10px] text-slate-400 font-medium shrink-0">({maxSlots} slots)</span>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">View Mode Filter</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-sm font-extrabold text-indigo-700">
                {filterType === "mine" ? "My Custom Schedule" : "Whole Class View"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Message Banner */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid Layout: Monday to Saturday */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          <p className="text-xs font-semibold text-slate-500">Retrieving schedule records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          {DAYS_OF_WEEK.map((day) => {
            const slotsForDay = timetableEntries.filter(
              (slot) => String(slot.day).toLowerCase() === day.toLowerCase()
            );

            return (
              <div 
                key={day} 
                className="bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm min-h-[320px]"
              >
                {/* Day Header */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {day}
                  </span>
                  <span className="text-[10px] font-bold bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                    {slotsForDay.length}
                  </span>
                </div>

                {/* Slots List */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
                  {slotsForDay.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                      <Clock className="w-6 h-6 mb-1 text-slate-200" />
                      <span className="text-[10px] font-semibold">Free Day</span>
                    </div>
                  ) : (
                    slotsForDay.map((slot, idx) => {
                      const subjectObj = subjectsList.find(
                        (s: any) => s && (s._id === slot.subject_id || s.id === slot.subject_id)
                      );
                      const subjectName = subjectObj ? (subjectObj.name || subjectObj.subject) : slot.subject_id;
                      
                      const isMySlot = slot.teacher_id === currentUserId;

                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          key={slot._id || idx}
                          className={`relative border rounded-xl p-3 hover:border-slate-300 transition-all flex flex-col gap-1.5 ${
                            isMySlot 
                              ? "bg-cyan-50/30 border-cyan-200/80 shadow-xs" 
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          {/* Highlight tag for my classes */}
                          {isMySlot && (
                            <span className="absolute top-2 right-2 text-[8px] font-bold bg-cyan-600 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                              Mine
                            </span>
                          )}

                          {/* Time & Duration */}
                          <div className={`flex items-center gap-1.5 text-[10px] font-mono font-bold ${
                            isMySlot ? "text-cyan-800" : "text-cyan-700"
                          }`}>
                            <Clock className="w-3 h-3 text-cyan-600 shrink-0" />
                            <span>
                              {slot.start_time} - {slot.end_time}
                            </span>
                          </div>

                          {/* Subject */}
                          <div className="flex items-start gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[11px] font-bold text-slate-800 leading-tight truncate" title={subjectName}>
                                {subjectName}
                              </h4>
                            </div>
                          </div>

                          {/* Teacher / Room / Class Section details */}
                          <div className="space-y-1 pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-500">
                            {/* Class section name - very useful when showing 'My Schedule' */}
                            {filterType === "mine" && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-700 truncate" title={getClassDetails(slot.class_id)}>
                                  Class: {getClassDetails(slot.class_id)}
                                </span>
                              </div>
                            )}

                            {/* Teacher name */}
                            {filterType === "all" && (
                              <div className="flex items-center gap-1.5 truncate">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className={`truncate ${isMySlot ? "font-semibold text-cyan-800" : ""}`} title={getTeacherName(slot.teacher_id)}>
                                  {getTeacherName(slot.teacher_id)}
                                </span>
                              </div>
                            )}

                            {slot.room && (
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate font-semibold text-slate-600" title={slot.room}>
                                  {slot.room}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
