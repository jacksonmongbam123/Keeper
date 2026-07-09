import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info, 
  RefreshCw,
  Award,
  Sparkles
} from "lucide-react";

interface StudentAttendanceCalendarViewProps {
  absencesList: any[];
  userDirectory: any[];
  currentUserId: string;
  currentUsername: string;
  isLoadingAbsences?: boolean;
  onRefresh?: () => void;
}

export default function StudentAttendanceCalendarView({
  absencesList = [],
  userDirectory = [],
  currentUserId = "",
  currentUsername = "",
  isLoadingAbsences = false,
  onRefresh
}: StudentAttendanceCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Months list
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Get days in the current month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // Get the day of the week the 1st of the month falls on (0 = Sunday, 1 = Monday, etc.)
  // We'll map it to Monday-first: 0 = Mon, 1 = Tue, ..., 6 = Sun
  const firstDayIndex = useMemo(() => {
    const day = new Date(currentYear, currentMonth, 1).getDay();
    // JS getDay(): 0 is Sunday, 1 is Monday...
    // Mon-first mapping: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    return day === 0 ? 6 : day - 1;
  }, [currentYear, currentMonth]);

  // Get absences specifically for this student
  const studentAbsences = useMemo(() => {
    const usernameLower = currentUsername.toLowerCase();
    const userIdLower = currentUserId.toLowerCase();

    return absencesList.filter((abs: any) => {
      if (!abs || !abs.studentID) return false;
      const sid = String(abs.studentID).toLowerCase();
      return sid === usernameLower || sid === userIdLower;
    });
  }, [absencesList, currentUsername, currentUserId]);

  // Create an lookup Map of absent dates "YYYY-MM-DD" for fast check
  const absentDatesMap = useMemo(() => {
    const map = new Map<string, any>();
    studentAbsences.forEach((abs) => {
      if (abs && abs.date) {
        try {
          const dateStr = new Date(abs.date).toISOString().split("T")[0];
          map.set(dateStr, abs);
        } catch {
          // If invalid date string, try exact match or ignore
          const dateStr = String(abs.date).split("T")[0];
          map.set(dateStr, abs);
        }
      }
    });
    return map;
  }, [studentAbsences]);

  // Days list to render in the calendar grid
  const calendarCells = useMemo(() => {
    const cells = [];
    
    // Empty cells for padding before the first day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ isPadding: true, key: `pad-${i}` });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(currentYear, currentMonth, day);
      
      // Formatting date key: YYYY-MM-DD
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dateObj.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Check if it's weekend
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Check if future date
      const isFuture = dateObj.getTime() > new Date().getTime() && dateStr !== todayStr;

      // Check if absent
      const isAbsent = absentDatesMap.has(dateStr);

      // Status logic:
      // - Future: "upcoming"
      // - Weekend: "weekend"
      // - Has absence record: "absent"
      // - Otherwise: "present"
      let status: "present" | "absent" | "weekend" | "upcoming" = "present";
      if (isFuture) {
        status = "upcoming";
      } else if (isAbsent) {
        status = "absent";
      } else if (isWeekend) {
        status = "weekend";
      }

      cells.push({
        isPadding: false,
        day,
        dateStr,
        status,
        isToday: dateStr === todayStr,
        key: `day-${day}`
      });
    }

    return cells;
  }, [currentYear, currentMonth, daysInMonth, firstDayIndex, absentDatesMap]);

  // Statistics calculation for the current visible month
  const stats = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let weekendCount = 0;
    let totalSchoolDays = 0;

    calendarCells.forEach(cell => {
      if (cell.isPadding) return;
      if (cell.status === "upcoming") return;

      if (cell.status === "absent") {
        absentCount++;
        totalSchoolDays++;
      } else if (cell.status === "present") {
        presentCount++;
        totalSchoolDays++;
      } else if (cell.status === "weekend") {
        weekendCount++;
      }
    });

    const attendanceRate = totalSchoolDays > 0 
      ? Math.round((presentCount / totalSchoolDays) * 100) 
      : 100;

    return {
      presentCount,
      absentCount,
      weekendCount,
      totalSchoolDays,
      attendanceRate
    };
  }, [calendarCells]);

  return (
    <div className="space-y-6">
      {/* Top Welcome Alert Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-100 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
        <div>
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-emerald-600 animate-pulse" />
            My Monthly Attendance Calendar
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review your presence records day-by-day. Green marks indicate full presence, red marks indicate logged absences.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoadingAbsences}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAbsences ? "animate-spin" : ""}`} />
            {isLoadingAbsences ? "Syncing..." : "Sync Attendance"}
          </button>
        )}
      </div>

      {/* Stats Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Attendance rate */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Attendance Rate</span>
            <div className="p-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-black text-slate-800">{stats.attendanceRate}%</span>
            <span className="text-[10px] text-slate-400 font-semibold">this month</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
            Active School Days: {stats.totalSchoolDays}
          </span>
        </div>

        {/* Present Days */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Days Present</span>
            <div className="p-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-black text-emerald-600">{stats.presentCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold">days logged</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
            Academic Participation
          </span>
        </div>

        {/* Absent Days */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Days Absent</span>
            <div className="p-1.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-black text-rose-600">{stats.absentCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold">absences</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
            Attendance Exceptions
          </span>
        </div>

        {/* Overall Status */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Standing</span>
            <div className="p-1.5 bg-violet-50 border border-violet-100 text-violet-600 rounded-lg">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              stats.attendanceRate >= 90 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                : stats.attendanceRate >= 75
                ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "bg-rose-50 text-rose-700 border border-rose-100"
            }`}>
              {stats.attendanceRate >= 90 ? "Excellent" : stats.attendanceRate >= 75 ? "Good" : "Needs Review"}
            </span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-2">
            Required Rate: 75% Min
          </span>
        </div>
      </div>

      {/* Main Calendar Body */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {/* Month Navigation Row */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-800">
              {months[currentMonth]} {currentYear}
            </h3>
            <span className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
              School Term View
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer transition-all"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl cursor-pointer transition-all"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer transition-all"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600/10" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-rose-500 border border-rose-600/10" />
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-200/60" />
            <span>Weekend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-slate-50 border border-slate-200/40" />
            <span>Not Logged / Upcoming</span>
          </div>
        </div>

        {/* Month Calendar Grid */}
        <div className="grid grid-cols-7 gap-2.5">
          {/* Weekday headers */}
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
            <div key={dayName} className="text-center py-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {dayName}
            </div>
          ))}

          {/* Calendar cells */}
          {calendarCells.map((cell, idx) => {
            if (cell.isPadding) {
              return (
                <div 
                  key={cell.key} 
                  className="aspect-square bg-slate-50/30 rounded-xl border border-transparent"
                />
              );
            }

            // Cell styling based on status
            let cellBg = "";
            let cellBorder = "";
            let cellText = "";
            let labelText = "";

            if (cell.status === "present") {
              cellBg = "bg-emerald-50 hover:bg-emerald-100/80";
              cellBorder = "border-emerald-200/80";
              cellText = "text-emerald-700 font-bold";
              labelText = "Present";
            } else if (cell.status === "absent") {
              cellBg = "bg-rose-50 hover:bg-rose-100/80";
              cellBorder = "border-rose-200/80";
              cellText = "text-rose-700 font-bold";
              labelText = "Absent";
            } else if (cell.status === "weekend") {
              cellBg = "bg-amber-50/40 hover:bg-amber-100/30";
              cellBorder = "border-amber-200/20";
              cellText = "text-amber-700/80 font-medium";
              labelText = "Weekend";
            } else {
              cellBg = "bg-slate-50/60 hover:bg-slate-100/60";
              cellBorder = "border-slate-200/40";
              cellText = "text-slate-400 font-normal";
              labelText = "—";
            }

            return (
              <motion.div
                whileHover={{ scale: 1.02 }}
                key={cell.key}
                className={`p-2 rounded-xl border flex flex-col justify-between aspect-square items-center transition-all ${cellBg} ${cellBorder} ${cellText} relative ${
                  cell.isToday ? "ring-2 ring-indigo-500 ring-offset-1" : ""
                }`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-semibold ${cell.isToday ? "text-indigo-600 font-black" : "text-slate-400"}`}>
                    {cell.day}
                  </span>
                  {cell.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Today" />
                  )}
                </div>

                {/* Status shorthand display */}
                <span className="text-[10px] uppercase tracking-wide font-black pb-1">
                  {labelText}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Absence detail info logs */}
      {studentAbsences.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3.5 flex items-center gap-2">
            <Info className="w-4 h-4 text-rose-500" />
            Detailed Absence Records ({studentAbsences.length})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-1">
            {studentAbsences.map((abs, idx) => {
              let displayDate = "";
              try {
                displayDate = new Date(abs.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
              } catch {
                displayDate = String(abs.date);
              }

              return (
                <div key={idx} className="flex items-start gap-3 p-3 bg-rose-50/50 border border-rose-100/50 rounded-xl">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">{displayDate}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Reason / Notes: {abs.reason || "No explicit reason logged by instructor"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
