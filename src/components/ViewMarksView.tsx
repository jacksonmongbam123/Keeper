import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Award, 
  Search, 
  Calendar, 
  BookOpen, 
  RefreshCw, 
  TrendingUp, 
  Trophy, 
  ChevronDown, 
  Info,
  CheckCircle2,
  SlidersHorizontal
} from "lucide-react";

interface ViewMarksViewProps {
  marksList: any[];
  fetchMarks: () => Promise<void>;
  isLoadingMarks: boolean;
  marksFetchError: string;
  currentUserId: string;
  subjectsList: any[];
  mClassesList: any[];
  classSectionsList: any[];
  dfMarksGrades: any[];
  userDirectory: any[];
}

export default function ViewMarksView({
  marksList = [],
  fetchMarks,
  isLoadingMarks = false,
  marksFetchError = "",
  currentUserId = "",
  subjectsList = [],
  mClassesList = [],
  classSectionsList = [],
  dfMarksGrades = [],
  userDirectory = []
}: ViewMarksViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "score_desc" | "score_asc">("date_desc");

  // Filter marks for the currently logged in student
  const studentMarks = marksList.filter((mark: any) => {
    if (!mark) return false;
    const sId = mark.student_id && typeof mark.student_id === "object"
      ? mark.student_id._id || mark.student_id.id
      : mark.student_id;
    return String(sId) === String(currentUserId);
  });

  // Extract unique terms for filter dropdown
  const uniqueTerms = Array.from(
    new Set(
      studentMarks
        .map((m: any) => m.term)
        .filter(Boolean)
    )
  ) as string[];

  // Helper functions for names
  const getSubjectName = (subjectId: string) => {
    const sub = subjectsList.find((s: any) => s && (s._id === subjectId || s.id === subjectId));
    return sub ? sub.name : subjectId || "Unspecified Subject";
  };

  const getClassName = (classId: string) => {
    const matchedClass = mClassesList.find((c: any) => c && (c._id === classId || c.id === classId));
    if (matchedClass) {
      const csObj = classSectionsList.find((cs: any) => cs && (cs._id === matchedClass.class_section_id || cs.id === matchedClass.class_section_id));
      const sectionName = csObj ? (csObj.__section || csObj.section || "") : "";
      return `${matchedClass.class_name}${sectionName ? ` - ${sectionName}` : ""}`;
    }
    const csObj = classSectionsList.find((cs: any) => cs && (cs._id === classId || cs.id === classId));
    if (csObj) {
      return `${csObj.class || csObj.grade} - ${csObj.__section || csObj.section || ""}`;
    }
    return "Unknown Class";
  };

  const getGradeName = (gradeId: string, numericScore: number) => {
    const gradeObj = dfMarksGrades.find((g: any) => g && (g._id === gradeId || g.id === gradeId));
    if (gradeObj) return gradeObj.grade || gradeObj.name;

    // Fallback if no grade_id is matched
    const sortedGrades = [...dfMarksGrades].sort((a, b) => b.min_marks - a.min_marks);
    const matchedFallback = sortedGrades.find((g: any) => numericScore >= g.min_marks);
    return matchedFallback ? matchedFallback.grade : "N/A";
  };

  // Process marks: filtering and sorting
  const processedMarks = studentMarks
    .filter((mark: any) => {
      const subjectName = getSubjectName(mark.subject_id).toLowerCase();
      const termName = (mark.term || "").toLowerCase();
      const matchesSearch = subjectName.includes(searchTerm.toLowerCase());
      const matchesTerm = selectedTerm === "all" || termName === selectedTerm.toLowerCase();
      return matchesSearch && matchesTerm;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "date_desc") {
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      }
      if (sortBy === "date_asc") {
        return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
      }
      if (sortBy === "score_desc") {
        return Number(b.marks || 0) - Number(a.marks || 0);
      }
      if (sortBy === "score_asc") {
        return Number(a.marks || 0) - Number(b.marks || 0);
      }
      return 0;
    });

  // Calculate stats based on student marks
  const totalEvaluations = studentMarks.length;
  
  const numericMarks = studentMarks
    .map((m: any) => Number(m.marks))
    .filter((val) => !isNaN(val));

  const cumulativeAverage = numericMarks.length > 0 
    ? Math.round(numericMarks.reduce((sum, val) => sum + val, 0) / numericMarks.length)
    : 0;

  const highestScoreObj = studentMarks.reduce((max: any, current: any) => {
    const maxVal = max ? Number(max.marks) : -1;
    const currVal = Number(current.marks);
    if (!isNaN(currVal) && currVal > maxVal) return current;
    return max;
  }, null);

  const highestScore = highestScoreObj ? Number(highestScoreObj.marks) : 0;
  const highestSubject = highestScoreObj ? getSubjectName(highestScoreObj.subject_id) : "";

  // Dynamic status/remark based on cumulative average
  const getPerformanceRemark = (avg: number) => {
    if (avg >= 90) return { text: "Outstanding Merit", color: "text-emerald-700 bg-emerald-50 border-emerald-100" };
    if (avg >= 80) return { text: "Excellent Standing", color: "text-cyan-700 bg-cyan-50 border-cyan-100" };
    if (avg >= 70) return { text: "Good Academic Standing", color: "text-blue-700 bg-blue-50 border-blue-100" };
    if (avg >= 50) return { text: "Satisfactory", color: "text-amber-700 bg-amber-50 border-amber-100" };
    return { text: "Needs Academic Attention", color: "text-rose-700 bg-rose-50 border-rose-100" };
  };

  const remark = getPerformanceRemark(cumulativeAverage);

  // Style helper for grade badge
  const getGradeBadgeStyles = (grade: string) => {
    const g = String(grade).toUpperCase();
    if (g.startsWith("A")) return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
    if (g.startsWith("B")) return "bg-cyan-50 text-cyan-700 border border-cyan-200/60";
    if (g.startsWith("C")) return "bg-blue-50 text-blue-700 border border-blue-200/60";
    if (g.startsWith("D")) return "bg-amber-50 text-amber-700 border border-amber-200/60";
    return "bg-rose-50 text-rose-700 border border-rose-200/60";
  };

  // Score Bar color helper
  const getScoreBarColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500";
    if (score >= 80) return "bg-cyan-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Award className="w-5 h-5 text-indigo-600 animate-pulse" />
            My Evaluation & Marks Record
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse your comprehensive grading reports, subject marks, term exams, and cumulative score card.
          </p>
        </div>

        <button
          onClick={fetchMarks}
          disabled={isLoadingMarks}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMarks ? "animate-spin" : ""}`} />
          {isLoadingMarks ? "Updating..." : "Refresh Report"}
        </button>
      </div>

      {marksFetchError && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-600 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{marksFetchError}</span>
        </div>
      )}

      {/* Overview Stats Bento Grid */}
      {totalEvaluations > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cumulative Average */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cumulative Average</span>
              <div className="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-slate-800">{cumulativeAverage}%</span>
              <span className="text-[10px] text-slate-400 font-semibold">of 100</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
              Overall Academic Status
            </span>
          </div>

          {/* Highest Score */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Highest Marks</span>
              <div className="p-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg">
                <Trophy className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-slate-800">{highestScore}%</span>
              <span className="text-[10px] text-slate-400 font-semibold truncate block max-w-[120px]" title={highestSubject}>
                in {highestSubject}
              </span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
              Best Performance
            </span>
          </div>

          {/* Evaluations Done */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Evaluated Subjects</span>
              <div className="p-1.5 bg-cyan-50 border border-cyan-100 text-cyan-600 rounded-lg">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-slate-800">{totalEvaluations}</span>
              <span className="text-[10px] text-slate-400 font-semibold">assessments</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
              Total Grades Logged
            </span>
          </div>

          {/* Remarks Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Academic Standing</span>
              <div className="p-1.5 bg-violet-50 border border-violet-100 text-violet-600 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${remark.color}`}>
                {remark.text}
              </span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-2">
              Verified by Registrar
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Section */}
      {totalEvaluations > 0 && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subject name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Term selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Term:</span>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 cursor-pointer"
              >
                <option value="all">All Terms</option>
                {uniqueTerms.map((term) => (
                  <option key={term} value={term.toLowerCase()}>
                    {term}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort controller */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 cursor-pointer"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="score_desc">Highest Score</option>
                <option value="score_asc">Lowest Score</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Marks List / Cards Container */}
      {isLoadingMarks ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Retrieving academic marks database...</p>
        </div>
      ) : processedMarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {processedMarks.map((mark: any, idx) => {
            const mId = mark._id || mark.id;
            const score = Number(mark.marks) || 0;
            const subject = getSubjectName(mark.subject_id);
            const className = getClassName(mark.class_id);
            const gradeText = getGradeName(mark.grade_id, score);

            let formattedDate = "N/A";
            if (mark.date) {
              try {
                formattedDate = new Date(mark.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
              } catch (e) {
                formattedDate = String(mark.date);
              }
            }

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                key={mId}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                {/* Upper info row */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[9px] uppercase font-bold text-indigo-500 tracking-wider block">
                      {mark.term || "Regular Evaluation"}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 truncate" title={subject}>
                      {subject}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-semibold block truncate" title={className}>
                      {className}
                    </span>
                  </div>

                  {/* Grade Badge */}
                  <span className={`px-2.5 py-1 text-xs font-extrabold rounded-lg shrink-0 ${getGradeBadgeStyles(gradeText)}`}>
                    {gradeText}
                  </span>
                </div>

                {/* Score slider & progress track */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold">Marks Secured:</span>
                    <strong className="text-slate-800 font-bold">{score} / 100</strong>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(score)}`}
                      style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                    />
                  </div>
                </div>

                {/* Bottom metadata row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="font-semibold">{formattedDate}</span>
                  </div>

                  <span className="text-[9px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                    Grade Registered
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-300 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Award className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-slate-800">No marks evaluations recorded</h4>
            <p className="text-xs text-slate-500">
              There are no grades or mark evaluations logged under your student profile yet. Once instructors publish term scores, they will instantly appear here.
            </p>
          </div>
          <button
            onClick={fetchMarks}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Check Again
          </button>
        </div>
      )}
    </div>
  );
}
