import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  Upload, 
  BookOpen, 
  GraduationCap, 
  Trash2, 
  Download, 
  FileCode2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Calendar
} from "lucide-react";

interface AssignHomeworkViewProps {
  token: string;
  classSectionsList: any[];
  subjectsList: any[];
}

export default function AssignHomeworkView({
  token,
  classSectionsList = [],
  subjectsList = [],
}: AssignHomeworkViewProps) {
  // Form State
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // App States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Drag and Drop Zone State
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Homework History List
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Fetch homework list for the selected class
  const fetchHomeworkHistory = async (classId: string) => {
    if (!classId) {
      setHomeworkList([]);
      return;
    }
    setIsLoadingHistory(true);
    setHistoryError("");
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
        // If the backend returns no homeworks (or empty/error message)
        if (Array.isArray(data)) {
          setHomeworkList(data.filter(Boolean));
        } else {
          setHomeworkList([]);
        }
      } else {
        // Handle gracefully if endpoint returns 401/404 or other errors
        setHomeworkList([]);
      }
    } catch (err: any) {
      console.error("Error fetching homework history:", err);
      setHistoryError("Failed to fetch homework history.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Fetch history when selectedClassId changes
  useEffect(() => {
    fetchHomeworkHistory(selectedClassId);
  }, [selectedClassId]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg("");
      setSuccessMsg("");
    }
  };

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Handle Drag Leave
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMsg("");
      setSuccessMsg("");
    }
  };

  // Trigger file selection click
  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Remove selected file
  const removeSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle form submit
  const handleAssignHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedClassId) {
      setErrorMsg("Please select a Class Section.");
      return;
    }
    if (!selectedSubjectId) {
      setErrorMsg("Please select a Subject.");
      return;
    }
    if (!selectedFile) {
      setErrorMsg("Please upload a homework document.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build form data
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Perform POST request
      const res = await fetch("/homework/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "class_id": selectedClassId,
          "subject_id": selectedSubjectId,
        },
        body: formData,
      });

      if (res.ok) {
        setSuccessMsg("Homework assignment assigned and published successfully!");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        // Refresh the homework history list
        fetchHomeworkHistory(selectedClassId);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setErrorMsg(errorData.message || "Failed to upload homework. Please verify fields and token.");
      }
    } catch (err: any) {
      console.error("Error submitting homework:", err);
      setErrorMsg("Network error: Failed to publish homework assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle downloading a homework file
  const handleDownloadHomework = async (homework: any) => {
    try {
      const res = await fetch("/homework/download", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "schema_id": homework._id,
        },
      });

      if (!res.ok) {
        throw new Error("Unable to download the homework document.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Use assigned file_id as filename, fallback to schema-based name
      a.download = homework.file_id || `homework_${homework._id}${homework.file_extension || ""}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Form to assign homework */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-cyan-600" />
            Assign Homework
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Publish new coursework assignments for student groups</p>
        </div>

        <form onSubmit={handleAssignHomework} className="space-y-4">
          {/* Success / Error Banners */}
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Class Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              Target Class Section <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700"
            >
              <option value="">-- Choose Class Section --</option>
              {classSectionsList.map((cs: any) => (
                <option key={cs._id || cs.id} value={cs._id || cs.id}>
                  {cs.class || cs.grade} - {cs.__section || cs.section || "N/A"}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              Academic Subject <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700"
            >
              <option value="">-- Choose Subject --</option>
              {subjectsList.map((sub: any) => (
                <option key={sub._id || sub.id} value={sub._id || sub.id}>
                  {sub.name || sub.subject}
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop File Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              Coursework Document <span className="text-rose-500">*</span>
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                isDragging 
                  ? "border-cyan-500 bg-cyan-50/50" 
                  : selectedFile 
                    ? "border-emerald-300 bg-emerald-50/20" 
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {!selectedFile ? (
                <>
                  <div className="bg-white p-2.5 rounded-full shadow-sm border border-slate-100 mb-3">
                    <Upload className="w-5 h-5 text-cyan-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Drag & drop files here, or browse</p>
                  <p className="text-[10px] text-slate-400 mt-1">Supports PDF, DOCX, Images, etc.</p>
                </>
              ) : (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    Document Selected
                  </div>
                  <div className="bg-white border border-slate-100 rounded-xl p-2.5 flex items-center justify-between gap-3 text-left shadow-sm max-w-xs mx-auto">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-700 font-semibold truncate">{selectedFile.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeSelectedFile}
                      className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isSubmitting
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-slate-950 hover:bg-slate-900 text-white shadow-sm"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing Assignment...
              </>
            ) : (
              <>
                <FileCode2 className="w-4 h-4" />
                Publish Homework Assignment
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Homework History list */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-[520px]">
        <div className="border-b border-slate-100 pb-3 mb-4 shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-600" />
              Coursework History
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Assigned tasks for the selected cohort group</p>
          </div>
          {selectedClassId && (
            <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 uppercase">
              Class: {(() => {
                const c = classSectionsList.find(item => (item._id || item.id) === selectedClassId);
                return c ? (c.class || c.grade || "N/A") : "N/A";
              })()}
            </span>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {!selectedClassId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <div className="bg-slate-50 p-4 rounded-full border border-slate-100">
                <FileCode2 className="w-8 h-8 text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600">No Target Class Section Selected</p>
                <p className="text-[10px] text-slate-400 max-w-xs mt-1">Select a class section from the form dropdown on the left to review published homework records.</p>
              </div>
            </div>
          ) : isLoadingHistory ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
              <p className="text-[11px] font-medium">Retrieving homework catalog...</p>
            </div>
          ) : historyError ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-rose-500 space-y-2">
              <AlertCircle className="w-6 h-6" />
              <p className="text-xs font-bold">{historyError}</p>
              <button
                onClick={() => fetchHomeworkHistory(selectedClassId)}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold border border-slate-200 transition-all cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : homeworkList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <div className="bg-slate-50 p-4 rounded-full border border-slate-100">
                <BookOpen className="w-8 h-8 text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600">No Assigned Homework Found</p>
                <p className="text-[10px] text-slate-400 max-w-xs mt-1">There are no assignments published to this class group yet. Create your first task using the left panel.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {homeworkList.map((hw: any, idx: number) => {
                const subObj = subjectsList.find(s => (s._id || s.id) === hw.subject_id);
                const subjectLabel = subObj ? (subObj.name || subObj.subject) : hw.subject_id;
                
                // Format date elegantly
                const formattedDate = hw.date 
                  ? new Date(hw.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : "Unknown Date";

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    key={hw._id || idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-300 transition-all"
                  >
                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-lg border border-cyan-200">
                          {subjectLabel}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <FileCode2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <p className="text-xs font-semibold truncate" title={hw.file_id}>
                          {hw.file_id || "homework_assignment"}
                        </p>
                        <span className="text-[9px] text-slate-400 bg-slate-200/50 px-1 rounded uppercase font-bold shrink-0">
                          {hw.file_extension || ".docx"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadHomework(hw)}
                      className="bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 p-2 rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
                      title="Download Homework Material"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
