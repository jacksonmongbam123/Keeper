import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  MapPin, 
  User, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ChevronDown,
  X,
  FileSpreadsheet
} from "lucide-react";

interface ManageTimetableViewProps {
  token: string;
  classSectionsList: any[];
  subjectsList: any[];
  userDirectory: any[];
  organizationId?: string;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export default function ManageTimetableView({
  token,
  classSectionsList = [],
  subjectsList = [],
  userDirectory = [],
  organizationId
}: ManageTimetableViewProps) {
  // Filters and Selectors
  const [selectedClassId, setSelectedClassId] = useState("");
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form State for Adding Entry
  const [isAdding, setIsAdding] = useState(false);
  const [formDay, setFormDay] = useState("Monday");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staging ID normalization helper
  const normalizeOrgId = (id: any): string => {
    if (!id) return "";
    const idStr = String(id).trim().toLowerCase();
    if (idStr === "6a489ad4de9f134ee6c3b5ef") {
      return "6a48a06fde9f134ee6c3d763";
    }
    return idStr;
  };

  // Filter class sections to the admin's organization scope
  const filteredClassSections = classSectionsList.filter((cs: any) => {
    if (!cs) return false;
    if (organizationId) {
      return normalizeOrgId(cs.organization_id) === normalizeOrgId(organizationId);
    }
    return true;
  });

  const allowedClassIds = new Set(filteredClassSections.map((cs: any) => cs._id || cs.id));

  // Filter teachers/instructors from the directory
  const teachersList = userDirectory.filter(
    (u: any) => u && String(u.role).toLowerCase() === "instructor"
  );

  // Helper: Format teacher name beautifully
  const getTeacherName = (teacherId: string) => {
    if (!teacherId) return "No teacher assigned";
    const t = userDirectory.find((u: any) => u && (u._id === teacherId || u.id === teacherId));
    if (!t) return "Unknown Teacher";
    const first = t.first_name || "";
    const last = t.last_name || "";
    return `${first} ${last}`.trim() || t.username || "Instructor";
  };

  // Fetch Timetable Entries for Selected Class
  const fetchTimetable = async (classId: string) => {
    if (!classId) {
      setTimetableEntries([]);
      return;
    }
    
    // Strict organization boundaries enforcement
    if (organizationId && !allowedClassIds.has(classId)) {
      setErrorMsg("Unauthorized access: This class section belongs to another institution.");
      setTimetableEntries([]);
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("https://abms-lkw9.onrender.com/timetable/retrieve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ class_id: classId })
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Sort chronologically by start time and filter out any items from other organizations
          const sorted = data
            .filter((slot: any) => slot && allowedClassIds.has(slot.class_id))
            .sort((a: any, b: any) => {
              return (a.start_time || "").localeCompare(b.start_time || "");
            });
          setTimetableEntries(sorted);
        } else {
          setTimetableEntries([]);
        }
      } else {
        setTimetableEntries([]);
        setErrorMsg("Failed to load timetable entries for this class section.");
      }
    } catch (err: any) {
      console.error("Error fetching timetable:", err);
      setErrorMsg("Network error: Could not fetch timetable.");
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch when selected class changes
  useEffect(() => {
    fetchTimetable(selectedClassId);
  }, [selectedClassId]);

  // Handle Create Timetable Entry
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedClassId) {
      setErrorMsg("Please select a target class section first.");
      return;
    }
    if (!formSubjectId) {
      setErrorMsg("Please select a subject.");
      return;
    }
    if (!formStartTime || !formEndTime) {
      setErrorMsg("Please enter both start and end times.");
      return;
    }
    if (formStartTime >= formEndTime) {
      setErrorMsg("Start time must be strictly earlier than end time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("https://abms-lkw9.onrender.com/timetable/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          class_id: selectedClassId,
          subject_id: formSubjectId,
          day: formDay,
          start_time: formStartTime,
          end_time: formEndTime,
          teacher_id: formTeacherId,
          room: formRoom
        })
      });

      if (res.ok) {
        setSuccessMsg("New slot added to the timetable successfully!");
        // Reset non-static fields
        setFormRoom("");
        setFormTeacherId("");
        setIsAdding(false);
        // Refresh timetable list
        fetchTimetable(selectedClassId);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || errData.message || "Failed to create timetable slot.");
      }
    } catch (err: any) {
      console.error("Error adding slot:", err);
      setErrorMsg("Network error: Failed to submit timetable slot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Timetable Entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this timetable slot?")) return;
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`https://abms-lkw9.onrender.com/timetable/delete/${entryId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        setSuccessMsg("Timetable slot removed successfully.");
        fetchTimetable(selectedClassId);
      } else {
        setErrorMsg("Failed to delete this timetable entry.");
      }
    } catch (err) {
      console.error("Error deleting entry:", err);
      setErrorMsg("Network error: Failed to delete slot.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel (Class Timetable & Schedule Builder Container) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-cyan-600 animate-pulse" />
            Class Timetable & Schedule Builder
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Design and organize course lecture hours, subjects, room assignments, and faculty mentors for each group cohort.
          </p>
        </div>

        {/* Controls Panel (Right-aligned inside the header container) */}
        <div className="pt-4 border-t border-slate-100 flex justify-end items-center gap-3">
          {/* Class Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cohort:</span>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700 cursor-pointer"
            >
              <option value="">-- Choose Class Section --</option>
              {filteredClassSections.map((cs: any) => (
                <option key={cs._id || cs.id} value={cs._id || cs.id}>
                  {cs.grade} - {cs.__section || cs.section || "N/A"}
                </option>
              ))}
            </select>
          </div>

          {selectedClassId && (
            <button
              onClick={() => {
                setErrorMsg("");
                setSuccessMsg("");
                setIsAdding(true);
              }}
              className="bg-slate-950 hover:bg-slate-900 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Slot
            </button>
          )}
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

      {/* Timetable Board Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {!selectedClassId ? (
          <div className="text-center text-slate-400 flex flex-col items-center justify-center py-16 space-y-4">
            <div className="bg-slate-50 p-4 rounded-full border border-slate-100">
              <Calendar className="w-10 h-10 text-slate-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700">No Cohort Group Selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Please choose a class section from the dropdown selector in the header panel above to build, preview, or manage its weekly academic timetable.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="text-center text-slate-400 flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
            <p className="text-xs font-semibold text-slate-500">Compiling class timetable slots...</p>
          </div>
        ) : (
          /* Grid Layout: 6 Columns for days of the week */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            {DAYS_OF_WEEK.map((day) => {
              const slotsForDay = timetableEntries.filter(
                (slot) => String(slot.day).toLowerCase() === day.toLowerCase()
              );

              return (
                <div 
                  key={day} 
                  className="bg-slate-50/50 border border-slate-200/60 rounded-2xl flex flex-col min-h-[350px]"
                >
                  {/* Day Header */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-white/80 rounded-t-2xl flex items-center justify-between shrink-0">
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
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-300 border-2 border-dashed border-slate-200/50 rounded-xl">
                        <Clock className="w-6 h-6 mb-1 text-slate-200" />
                        <span className="text-[10px] font-semibold">Free Day</span>
                      </div>
                    ) : (
                      slotsForDay.map((slot, idx) => {
                        const subjectObj = subjectsList.find(
                          (s: any) => s && (s._id === slot.subject_id || s.id === slot.subject_id)
                        );
                        const subjectName = subjectObj ? (subjectObj.name || subjectObj.subject) : slot.subject_id;

                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            key={slot._id || idx}
                            className="group relative bg-white border border-slate-200 rounded-xl p-3 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col gap-1.5"
                          >
                            {/* Delete Button (visible on group hover) */}
                            <button
                              onClick={() => handleDeleteEntry(slot._id)}
                              className="absolute top-2.5 right-2.5 p-1 bg-white hover:bg-rose-50 border border-slate-100 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-lg shadow-sm md:opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Delete slot"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {/* Time & Duration */}
                            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-700">
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

                            {/* Teacher & Room */}
                            <div className="space-y-1 pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-500">
                              {slot.teacher_id && (
                                <div className="flex items-center gap-1.5 truncate">
                                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate" title={getTeacherName(slot.teacher_id)}>
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

      {/* Add Entry Modal Overlay */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Add Schedule Slot
                  </h3>
                </div>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1 hover:bg-slate-200/80 rounded-lg transition-all text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="p-6 space-y-4">
                {/* Day Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Day of the Week <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700 cursor-pointer"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Subject / Course <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700 cursor-pointer"
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjectsList.map((sub: any) => (
                      <option key={sub._id || sub.id} value={sub._id || sub.id}>
                        {sub.name || sub.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Start Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700 cursor-pointer font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      End Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700 cursor-pointer font-mono"
                    />
                  </div>
                </div>

                {/* Faculty Mentor Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Faculty Instructor
                  </label>
                  <select
                    value={formTeacherId}
                    onChange={(e) => setFormTeacherId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700 cursor-pointer"
                  >
                    <option value="">-- Optional (Assign Teacher) --</option>
                    {teachersList.map((t: any) => {
                      const first = t.first_name || "";
                      const last = t.last_name || "";
                      const display = `${first} ${last}`.trim() || t.username || "Instructor";
                      return (
                        <option key={t._id || t.id} value={t._id || t.id}>
                          {display} ({t.username})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Room / Location */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Room / Location
                  </label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    placeholder="e.g. Room 304, Biology Lab"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700 font-semibold"
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="bg-slate-100 hover:bg-slate-200/70 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSubmitting
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-slate-950 hover:bg-slate-900 text-white shadow-sm"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add Slot
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
