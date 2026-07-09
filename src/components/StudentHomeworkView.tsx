import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileCode2, 
  BookOpen, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Calendar,
  Sparkles,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  ClipboardCheck,
  Send,
  User,
  MessageSquare,
  Clock
} from "lucide-react";

interface StudentHomeworkViewProps {
  token: string;
  classSectionsList: any[];
  subjectsList: any[];
  studentClassRelations: any[];
  currentUserId: string;
}

export default function StudentHomeworkView({
  token,
  classSectionsList = [],
  subjectsList = [],
  studentClassRelations = [],
  currentUserId = ""
}: StudentHomeworkViewProps) {
  
  // Find current student's registered class
  const detectedClassId = useMemo(() => {
    const rel = studentClassRelations.find(r => r && r.student_id === currentUserId);
    return rel ? rel.class_id : "";
  }, [studentClassRelations, currentUserId]);

  // Selected Class Id for homework viewing
  const [selectedClassId, setSelectedClassId] = useState("");

  // Set the selectedClassId to detectedClassId initially if it exists
  useEffect(() => {
    if (detectedClassId) {
      setSelectedClassId(detectedClassId);
    } else {
      setSelectedClassId("");
    }
  }, [detectedClassId]);

  // Homework lists states
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Local submission states (persisted in localStorage)
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Active sub-tab inside homework: "assigned" | "submissions"
  const [subTab, setSubTab] = useState<"assigned" | "submissions">("assigned");

  // Form states for active submission
  const [submittingHwId, setSubmittingHwId] = useState<string | null>(null);
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitNotes, setSubmitNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load submissions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`abms_homework_submissions_${currentUserId}`);
      if (saved) {
        setSubmissions(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Could not load homework submissions:", e);
    }
  }, [currentUserId]);

  // Helper to save submissions to localStorage
  const saveSubmissions = (newSubs: any[]) => {
    setSubmissions(newSubs);
    try {
      localStorage.setItem(`abms_homework_submissions_${currentUserId}`, JSON.stringify(newSubs));
    } catch (e) {
      console.error("Could not save homework submissions:", e);
    }
  };

  // Fetch homework list for selected class section
  const fetchHomeworks = async (classId: string) => {
    if (!classId || classId !== detectedClassId) {
      setHomeworkList([]);
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/homework/getList", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "class_id": classId,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setHomeworkList(data.filter(Boolean));
        } else {
          setHomeworkList([]);
        }
      } else {
        setHomeworkList([]);
      }
    } catch (err) {
      console.error("Error retrieving homework list:", err);
      setErrorMsg("Failed to sync homework records from the server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto fetch when class section changes
  useEffect(() => {
    fetchHomeworks(selectedClassId);
  }, [selectedClassId]);

  // Handle Download Action
  const handleDownloadHomework = async (hw: any) => {
    try {
      const res = await fetch("/homework/download", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "schema_id": hw._id || hw.id,
        },
      });

      if (!res.ok) {
        throw new Error("Unable to download this file.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = hw.file_id || `assignment_${hw._id || hw.id}${hw.file_extension || ".docx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Download Error: " + err.message);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSubmitFile(e.dataTransfer.files[0]);
      setSubmitError("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSubmitFile(e.target.files[0]);
      setSubmitError("");
    }
  };

  const removeSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSubmitFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle Submission action
  const handleHomeworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (!submittingHwId) return;
    if (!submitFile) {
      setSubmitError("Please select or drag-and-drop a file to submit.");
      return;
    }

    setIsUploading(true);

    // Simulate real upload & local storage persistence
    setTimeout(() => {
      const targetHw = homeworkList.find(h => (h._id || h.id) === submittingHwId);
      const subSubject = subjectsList.find(s => s && (s._id === targetHw?.subject_id || s.id === targetHw?.subject_id));
      const subjectName = subSubject ? (subSubject.name || subSubject.subject) : "General";

      const newSubmission = {
        id: `sub_${Date.now()}`,
        homeworkId: submittingHwId,
        homeworkTitle: targetHw?.file_id || "Homework Assignment",
        subjectName,
        submittedAt: new Date().toISOString(),
        fileName: submitFile.name,
        fileSize: `${(submitFile.size / 1024).toFixed(1)} KB`,
        notes: submitNotes.trim(),
        status: "Submitted"
      };

      const updated = [newSubmission, ...submissions];
      saveSubmissions(updated);

      setIsUploading(false);
      setSubmitSuccess(true);
      setSubmitFile(null);
      setSubmitNotes("");
      
      // Close modal after delay
      setTimeout(() => {
        setSubmittingHwId(null);
        setSubmitSuccess(false);
        // Switch to submissions history automatically to show satisfaction
        setSubTab("submissions");
      }, 1500);
    }, 1200);
  };

  // Helper to check if a homework assignment was already submitted
  const getSubmissionStatus = (hwId: string) => {
    const found = submissions.find(s => s.homeworkId === hwId);
    return found ? found : null;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-100 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
        <div>
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <FileCode2 className="w-5 h-5 text-cyan-600 animate-pulse" />
            My Homework Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access academic coursework assigned by your instructors, download task documents, and instantly submit your solutions.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Class selector */}
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-xl text-xs w-full md:w-auto">
            <span className="text-slate-400 font-bold uppercase text-[10px] shrink-0">Viewing Class:</span>
            <span className="text-cyan-700 font-bold">
              {(() => {
                if (!detectedClassId) return "Unassigned Class";
                const matched = classSectionsList.find(cs => (cs._id || cs.id) === detectedClassId);
                return matched ? `${matched.grade} - ${matched.__section || matched.section || "N/A"}` : "Assigned Class";
              })()}
            </span>
          </div>

          <button
            onClick={() => fetchHomeworks(selectedClassId)}
            disabled={isLoading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl cursor-pointer disabled:opacity-50 transition-all shrink-0"
            title="Refresh homework list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-1 pb-px">
        <button
          onClick={() => setSubTab("assigned")}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "assigned"
              ? "border-cyan-500 text-cyan-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Assigned Homework ({homeworkList.length})
        </button>
        <button
          onClick={() => setSubTab("submissions")}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "submissions"
              ? "border-cyan-500 text-cyan-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          My Submissions ({submissions.length})
        </button>
      </div>

      {/* Sub Tab Content */}
      <div className="animate-fade-in">
        {subTab === "assigned" ? (
          /* Assigned Homework List */
          isLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
              <p className="text-xs font-medium">Fetching academic assignments...</p>
            </div>
          ) : errorMsg ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-rose-500 flex flex-col items-center justify-center space-y-3">
              <AlertCircle className="w-8 h-8" />
              <p className="text-xs font-bold">{errorMsg}</p>
              <button
                onClick={() => fetchHomeworks(selectedClassId)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200"
              >
                Retry Connection
              </button>
            </div>
          ) : homeworkList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-4">
              <div className="bg-slate-50 p-4 rounded-full border border-slate-100">
                <FolderOpen className="w-8 h-8 text-slate-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase">No Homework Assigned</h4>
                <p className="text-[10px] text-slate-400 max-w-sm mt-1 mx-auto">
                  Your instructor hasn't posted any homework assignments for this class section yet. Check back later!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {homeworkList.map((hw, idx) => {
                const subObj = subjectsList.find(s => s && (s._id === hw.subject_id || s.id === hw.subject_id));
                const subjectLabel = subObj ? (subObj.name || subObj.subject) : "General Subject";
                
                const formattedDate = hw.date 
                  ? new Date(hw.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : "Assigned recently";

                const submission = getSubmissionStatus(hw._id || hw.id);

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    key={hw._id || hw.id || idx}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 hover:border-slate-300 relative group"
                  >
                    {/* Header Info */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide bg-cyan-50 border border-cyan-100 text-cyan-700 px-2.5 py-0.5 rounded-lg">
                          {subjectLabel}
                        </span>
                        
                        {submission ? (
                          <span className="text-[9px] font-extrabold uppercase tracking-wide bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completed
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold uppercase tracking-wide bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Submission
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-2" title={hw.file_id}>
                          {hw.file_id || "Homework Assignment Description"}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Published: {formattedDate}
                        </p>
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-auto">
                      <button
                        onClick={() => handleDownloadHomework(hw)}
                        className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200/60 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Task
                      </button>

                      {submission ? (
                        <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50/50 px-3 py-2 rounded-xl border border-emerald-100/50">
                          Submitted {new Date(submission.submittedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </div>
                      ) : (
                        <button
                          onClick={() => setSubmittingHwId(hw._id || hw.id)}
                          className="text-[11px] font-bold text-white bg-slate-950 hover:bg-slate-900 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          Submit Work
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          /* Submissions History */
          submissions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-4 animate-fade-in">
              <div className="bg-slate-50 p-4 rounded-full border border-slate-100">
                <ClipboardCheck className="w-8 h-8 text-slate-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase">No Homework Submitted</h4>
                <p className="text-[10px] text-slate-400 max-w-sm mt-1 mx-auto">
                  You haven't submitted any homework solutions yet. Switch back to "Assigned Homework" to start submitting your work!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {submissions.map((sub, idx) => {
                const subDate = new Date(sub.submittedAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    key={sub.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-extrabold uppercase tracking-wide bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg">
                          {sub.subjectName}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {subDate}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800">
                          {sub.homeworkTitle}
                        </h4>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium text-slate-500">
                          <p className="flex items-center gap-1">
                            <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                            File: <span className="font-semibold text-slate-700 truncate max-w-xs">{sub.fileName}</span> ({sub.fileSize})
                          </p>
                          {sub.notes && (
                            <p className="flex items-center gap-1 text-slate-400 italic">
                              <MessageSquare className="w-3.5 h-3.5" />
                              "{sub.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/50 border border-emerald-200/50 px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Awaiting Grading
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Submission Modal Dialog overlay */}
      <AnimatePresence>
        {submittingHwId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5 relative"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  if (!isUploading) setSubmittingHwId(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-50"
              >
                ✕
              </button>

              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4.5 h-4.5 text-cyan-600" />
                  Submit Coursework Solution
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  Upload your completed assignment material and include comments for review.
                </p>
              </div>

              {submitSuccess ? (
                <div className="py-8 text-center space-y-3 flex flex-col items-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200 animate-bounce">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Homework Submitted Successfully!</h4>
                  <p className="text-[10px] text-slate-400">Your solution has been safely archived for grading.</p>
                </div>
              ) : (
                <form onSubmit={handleHomeworkSubmit} className="space-y-4">
                  {submitError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-[11px] font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Drag and Drop */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Upload File <span className="text-rose-500">*</span>
                    </label>

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px] ${
                        isDragging
                          ? "border-cyan-500 bg-cyan-50/50"
                          : submitFile
                            ? "border-emerald-300 bg-emerald-50/10"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {!submitFile ? (
                        <>
                          <Upload className="w-6 h-6 text-slate-400 mb-2" />
                          <p className="text-xs font-bold text-slate-700">Drag & drop files here, or browse</p>
                          <p className="text-[9px] text-slate-400 mt-1">PDF, Images, ZIP, DOC, up to 10MB</p>
                        </>
                      ) : (
                        <div className="w-full space-y-2">
                          <p className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> File Selected
                          </p>
                          <div className="bg-white border border-slate-100 rounded-xl p-2.5 flex items-center justify-between gap-3 text-left max-w-xs mx-auto shadow-2xs">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-slate-700 font-semibold truncate">{submitFile.name}</p>
                              <p className="text-[9px] text-slate-400 font-mono">{(submitFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button
                              type="button"
                              onClick={removeSelectedFile}
                              className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submission comments */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      Submission Comments / Notes (Optional)
                    </label>
                    <textarea
                      value={submitNotes}
                      onChange={(e) => setSubmitNotes(e.target.value)}
                      placeholder="e.g. Please find my solution for Chapter 3 exercises..."
                      rows={2.5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700 resize-none"
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => setSubmittingHwId(null)}
                      className="w-1/3 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isUploading}
                      className="w-2/3 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Submit Assignment
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
