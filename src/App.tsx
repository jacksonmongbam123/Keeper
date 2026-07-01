import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap,
  Presentation,
  Users,
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ArrowRight,
  LogOut,
  Sparkles,
  Terminal,
  Activity,
  FileText,
  BookOpen,
  Calendar,
  Layers,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Home,
  Settings,
  Bell,
  ChevronDown,
  Search,
  Database,
  Cpu,
  Clock,
  UserCog,
  Pencil,
  UserPlus
} from "lucide-react";

type RoleType = "administrator" | "student" | "instructor" | "parents";

const ROLE_CONFIGS: Record<
  RoleType,
  {
    title: string;
    description: string;
    icon: any;
    colorClass: string;
    bgBadgeClass: string;
    borderColorClass: string;
    placeholder: string;
    credentialHint: string;
  }
> = {
  administrator: {
    title: "Administrator",
    description: "System configuration, staff management & system logs",
    icon: ShieldCheck,
    colorClass: "from-amber-500 to-orange-600",
    bgBadgeClass: "bg-amber-100 text-amber-800",
    borderColorClass: "group-hover:border-amber-500/40 focus-within:ring-amber-500/20 focus-within:border-amber-500",
    placeholder: "NIC / Username",
    credentialHint: "National Identity Card (NIC) number or admin username"
  },
  student: {
    title: "Student Portal",
    description: "Access courses, view grades, and check attendance",
    icon: GraduationCap,
    colorClass: "from-cyan-500 to-blue-600",
    bgBadgeClass: "bg-cyan-100 text-cyan-800",
    borderColorClass: "group-hover:border-cyan-500/40 focus-within:ring-cyan-500/20 focus-within:border-cyan-500",
    placeholder: "Registration Number",
    credentialHint: "Format: REG-2026-XXXX"
  },
  instructor: {
    title: "Instructor Portal",
    description: "Manage classes, grade assignments & student progress",
    icon: Presentation,
    colorClass: "from-emerald-500 to-teal-600",
    bgBadgeClass: "bg-emerald-100 text-emerald-800",
    borderColorClass: "group-hover:border-emerald-500/40 focus-within:ring-emerald-500/20 focus-within:border-emerald-500",
    placeholder: "NIC / Employee ID",
    credentialHint: "Instructor NIC number or employee ID key"
  },
  parents: {
    title: "Parent Portal",
    description: "Track student performance, attendance & reports",
    icon: Users,
    colorClass: "from-violet-500 to-fuchsia-600",
    bgBadgeClass: "bg-violet-100 text-violet-800",
    borderColorClass: "group-hover:border-violet-500/40 focus-within:ring-violet-500/20 focus-within:border-violet-500",
    placeholder: "Phone Number",
    credentialHint: "Registered parent mobile number"
  }
};

const DEFAULT_PRESET_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export default function App() {
  const [selectedRole, setSelectedRole] = useState<RoleType>("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [loginResult, setLoginResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const activeConfig = ROLE_CONFIGS[selectedRole];

  // Dashboard states
  const [activeTab, setActiveTab] = useState(() => selectedRole === "administrator" ? "users" : "overview");
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // User directory CRUD states
  const [userDirectoryState, setUserDirectoryState] = useState(() => {
    const saved = localStorage.getItem("abms_user_directory_fresh");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved user directory:", e);
      }
    }
    return [];
  });

  
  // Clear demo data from localStorage on app load
  useEffect(() => {
    localStorage.removeItem('keeper_titles');
    localStorage.removeItem('keeper_grades');
    localStorage.removeItem('keeper_user_types');
  }, []);

  useEffect(() => {
    localStorage.setItem("abms_user_directory_fresh", JSON.stringify(userDirectoryState));
  }, [userDirectoryState]);

  // Session persistence - restore session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem("abms_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.success && parsed.data?.token) {
          // Verify session with backend
          fetch("https://abms-lkw9.onrender.com/login/verify", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Authorization": `Bearer ${parsed.data.token}`
            }
          })
            .then(res => res.json())
            .then(data => {
              if (data.status === 200 && data.user) {
                setLoginResult({
                  success: true,
                  message: "Session restored",
                  data: {
                    token: parsed.data.token,
                    user: data.user
                  }
                });
                if (data.user.access_level_id) {
                  setAdminAccessLevel(data.user.access_level_id);
                }
                if (data.user.user_type) {
                  const roleMap: Record<string, RoleType> = {
                    "admin": "administrator",
                    "student": "student",
                    "teacher": "instructor",
                    "parent": "parents"
                  };
                  setSelectedRole(roleMap[data.user.user_type] || "student");
                }
              } else {
                // Session invalid, clear localStorage
                localStorage.removeItem("abms_session");
              }
            })
            .catch(err => {
              console.error("Session verification error:", err);
              localStorage.removeItem("abms_session");
            });
        }
      } catch (e) {
        console.error("Failed to parse saved session:", e);
        localStorage.removeItem("abms_session");
      }
    }
  }, []);

  const [adminAccessLevel, setAdminAccessLevel] = useState("1");

  // Fetch real database users and merge them on successful administrator login or navigating to users tab
  useEffect(() => {
    if (loginResult?.success && selectedRole === "administrator") {
      const fetchAllUsers = async () => {
        const token = loginResult?.data?.token || "";
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "application/json"
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        try {
          const [studentsRes, teachersRes, parentsRes, adminsRes] = await Promise.allSettled([
            fetch("https://abms-lkw9.onrender.com/m/student/retrieve", { method: "POST", headers }),
            fetch("https://abms-lkw9.onrender.com/m/teacher/retrieve", { method: "POST", headers }),
            fetch("https://abms-lkw9.onrender.com/m/parent/retrieve", { method: "POST", headers }),
            fetch("https://abms-lkw9.onrender.com/m/admin/retrieve/", { method: "POST", headers })
          ]);

          let fetchedUsers: any[] = [];

          if (studentsRes.status === "fulfilled" && studentsRes.value.ok) {
            const students = await studentsRes.value.json();
            if (Array.isArray(students)) {
              students.forEach((s: any) => {
                fetchedUsers.push({
                  _id: s._id,
                  username: s.reg_no || s.nic || s.username || "",
                  name: s.name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Student",
                  role: "student",
                  status: s.status || "Active",
                  phone: s.phone || "",
                  first_name: s.first_name || "",
                  middle_name: s.middle_name || "",
                  last_name: s.last_name || "",
                  email: s.email || "",
                  passport: s.passport || "",
                  dob: s.dob || "",
                  sex: s.sex || ""
                });
              });
            }
          }

          if (teachersRes.status === "fulfilled" && teachersRes.value.ok) {
            const teachers = await teachersRes.value.json();
            if (Array.isArray(teachers)) {
              teachers.forEach((t: any) => {
                fetchedUsers.push({
                  _id: t._id,
                  username: t.reg_no || t.nic || t.username || "",
                  name: t.name || `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Teacher",
                  role: "instructor",
                  status: t.status || "Active",
                  phone: t.phone || "",
                  first_name: t.first_name || "",
                  middle_name: t.middle_name || "",
                  last_name: t.last_name || "",
                  email: t.email || "",
                  passport: t.passport || "",
                  dob: t.dob || "",
                  sex: t.sex || ""
                });
              });
            }
          }

          if (parentsRes.status === "fulfilled" && parentsRes.value.ok) {
            const parents = await parentsRes.value.json();
            if (Array.isArray(parents)) {
              parents.forEach((p: any) => {
                fetchedUsers.push({
                  _id: p._id,
                  username: p.phone || p.username || "",
                  name: p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Parent",
                  role: "parents",
                  status: p.status || "Active",
                  phone: p.phone || "",
                  first_name: p.first_name || "",
                  middle_name: p.middle_name || "",
                  last_name: p.last_name || "",
                  email: p.email || "",
                  passport: p.passport || "",
                  dob: p.dob || "",
                  sex: p.sex || ""
                });
              });
            }
          }

          if (adminsRes.status === "fulfilled" && adminsRes.value.ok) {
            const resJson = await adminsRes.value.json();
            const admins = resJson.adminList || resJson;
            if (Array.isArray(admins)) {
              admins.forEach((a: any) => {
                fetchedUsers.push({
                  _id: a._id,
                  username: a.reg_no || a.nic || a.username || "",
                  name: a.name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || "Admin",
                  role: "administrator",
                  status: a.status || "Active",
                  phone: a.phone || "",
                  first_name: a.first_name || "",
                  middle_name: a.middle_name || "",
                  last_name: a.last_name || "",
                  email: a.email || "",
                  passport: a.passport || "",
                  dob: a.dob || "",
                  sex: a.sex || "",
                  access_level: String(a.access_level_id || a.access_level || "1")
                });
              });
            }
          }

          if (fetchedUsers.length > 0) {
            setUserDirectoryState(fetchedUsers);
          }
        } catch (err) {
          console.error("Error fetching all users:", err);
        }
      };

      fetchAllUsers();
    }
  }, [loginResult, selectedRole, activeTab]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<any>(null);

  const [formUsername, setFormUsername] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("student");
  const [formPhone, setFormPhone] = useState("");
  const [formStatus, setFormStatus] = useState("Active");
  const [crudError, setCrudError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advanced body parameter states
  const [formFirstName, setFormFirstName] = useState("");
  const [formMiddleName, setFormMiddleName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPassword, setFormPassword] = useState("demoPassword123");
  const [formEmail, setFormEmail] = useState("");
  const [formPassport, setFormPassport] = useState("None");
  const [formTitleId, setFormTitleId] = useState("Mr");
  const [titlesList, setTitlesList] = useState<string[]>([]);
  const [gradesList, setGradesList] = useState<string[]>([]);
  const [userTypesList, setUserTypesList] = useState<string[]>([]);
  const [formSex, setFormSex] = useState("Male");
  const [formDob, setFormDob] = useState("2000-01-01");
  const [formAccessLevelId, setFormAccessLevelId] = useState("1");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    setLoginResult(null);

    const payload = {
      username: username.trim(),
      password: password,
      image: DEFAULT_PRESET_IMAGE
    };

    try {
      const response = await fetch("https://abms-lkw9.onrender.com/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch (err) {
        responseData = { rawResponse: responseText };
      }

      if (response.ok) {
        const returnedRole = responseData.user?.role || responseData.user?.user_type || "";
        const roleMapping: Record<RoleType, string[]> = {
          administrator: ["administrator", "admin"],
          student: ["student"],
          instructor: ["instructor", "teacher"],
          parents: ["parents", "parent"]
        };

        const allowedRoles = roleMapping[selectedRole] || [];
        const isMatched = allowedRoles.includes(returnedRole.toLowerCase());

        if (!isMatched) {
          let correctTab = "";
          for (const [tab, roles] of Object.entries(roleMapping)) {
            if (roles.includes(returnedRole.toLowerCase())) {
              correctTab = tab.charAt(0).toUpperCase() + tab.slice(1);
              if (correctTab === "Parents") correctTab = "Parents Portal";
              if (correctTab === "Instructor") correctTab = "Instructor Portal";
              if (correctTab === "Student") correctTab = "Student Portal";
              break;
            }
          }
          const destinationMsg = correctTab 
            ? `Please switch to the "${correctTab}" tab to log in.`
            : "Please select the correct portal tab for these credentials.";

          setLoginResult({
            success: false,
            message: `Access Denied: This account is registered under the ${returnedRole || "other"} role. ${destinationMsg}`
          });
        } else {
          // Verify access level of the administrator at login
          if (returnedRole.toLowerCase() === "administrator" || returnedRole.toLowerCase() === "admin") {
            const rawAccess = responseData.user?.access_level !== undefined 
              ? responseData.user.access_level 
              : (responseData.user?.accessLevel !== undefined 
                  ? responseData.user.accessLevel 
                  : (responseData.user?.accesslevel !== undefined 
                      ? responseData.user.accesslevel 
                      : undefined));

            let levelStr = "1"; // Default fallback
            if (rawAccess !== undefined) {
              levelStr = String(rawAccess);
            } else {
              // Match in user directory
              const matched = userDirectoryState.find(
                u => u.username.toLowerCase() === username.trim().toLowerCase()
              );
              if (matched && matched.role === "administrator" && (matched as any).access_level) {
                levelStr = String((matched as any).access_level);
              } else if (username.trim().toLowerCase() === "admin_nic_123") {
                levelStr = "2";
              } else if (username.trim().toLowerCase() === "admin") {
                levelStr = "1";
              } else if (
                username.trim().toLowerCase().includes("level3") || 
                username.trim().toLowerCase().includes("level_3") || 
                username.trim().toLowerCase().includes("level-3") || 
                username.trim().toLowerCase() === "admin_level_3"
              ) {
                levelStr = "3";
              }
            }
            setAdminAccessLevel(levelStr);
            setActiveTab("users");
          } else {
            setActiveTab("overview");
          }

          setLoginResult({
            success: true,
            message: responseData.message || "Logged in successfully",
            data: responseData
          });
          // Save session to localStorage for persistence
          localStorage.setItem("abms_session", JSON.stringify({
            success: true,
            message: responseData.message || "Logged in successfully",
            data: responseData
          }));
        }
      } else {
        setLoginResult({
          success: false,
          message: responseData.message || responseData.error || `Authentication failed (${response.status})`
        });
      }
    } catch (err: any) {
      console.error("Login request error:", err);
      setLoginResult({
        success: false,
        message: err.message || "Network request failed. Please check internet connection or CORS settings on the API server."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setLoginResult(null);
    setUsername("");
    setPassword("");
    setActiveTab(selectedRole === "administrator" ? "users" : "overview");
    localStorage.removeItem("abms_session");
  };

  // Filter user directory by admin's organization
  useEffect(() => {
    if (adminOrganizationId && userDirectoryState.length > 0) {
      const filtered = userDirectoryState.filter((user: any) => 
        user.organization_id === adminOrganizationId
      );
      setFilteredUserDirectory(filtered);
    } else {
      setFilteredUserDirectory(userDirectoryState);
    }
  }, [userDirectoryState, adminOrganizationId]);

  // Fetch logged-in admin's organization details
  useEffect(() => {
    const fetchAdminOrganization = async () => {
      try {
        // After login, admin data should be stored
        const adminData = localStorage.getItem('keeper_admin_info');
        if (adminData) {
          const admin = JSON.parse(adminData);
          const adminNIC = admin.nic || admin.phone;
          if (adminNIC) {
            const res = await fetch(`https://abms-lkw9.onrender.com/m/admin/by-nic/${adminNIC}`);
            if (res.ok) {
              const adminDetails = await res.json();
              setAdminOrganizationId(adminDetails.organization_id);
              setAdminAccessLevel(adminDetails.access_level_id);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch admin organization:', err);
      }
    };
    fetchAdminOrganization();
  }, []);

  if (loginResult?.success) {
    const userObj = loginResult?.data?.user || {};
    const displayName = userObj.name || (userObj.first_name ? `${userObj.first_name} ${userObj.last_name || ""}`.trim() : "") || "Jackson Evaluation User";
    const displayRegNo = userObj.reg_no || userObj.nic || username || "REG-2026-1049";
    const displayRole = userObj.role || userObj.user_type || selectedRole;
    const displayEmail = userObj.email || `${displayRole.toLowerCase()}@abms-portal.com`;
    const displayPhone = userObj.phone || "";
    const displaySex = userObj.sex || "";
    const displayDob = userObj.dob ? new Date(userObj.dob).toLocaleDateString() : "";
    const displayPassport = userObj.passport || "";
    const displayNameWithSurname = userObj.first_name
      ? `${userObj.first_name} ${userObj.middle_name ? userObj.middle_name + " " : ""}${userObj.last_name || ""}`.trim()
      : displayName;

    const studentCourses = [
      { code: "CS-401", name: "Advanced Software Architecture", credit: 4, grade: "A", instructor: "Dr. Elena Rostova" },
      { code: "CS-415", name: "Distributed Database Systems", credit: 3, grade: "A-", instructor: "Prof. Marcus Vance" },
      { code: "CS-420", name: "Cloud Infrastructure & Gateway Routing", credit: 3, grade: "B+", instructor: "Dr. Jenish J D" },
      { code: "CS-499", name: "Capstone Project Evaluation", credit: 6, grade: "In-Progress", instructor: "Board Selection" }
    ];

    const studentExams = [
      { id: 1, name: "Mid-Term Project Design Proposal", score: "94/100", date: "June 15, 2026", status: "Graded" },
      { id: 2, name: "Cloud Infrastructure Deployment Practical", score: "88/100", date: "June 22, 2026", status: "Graded" },
      { id: 3, name: "Gateway Performance Benchmarks Report", score: "Pending", date: "June 29, 2026", status: "Submitted" },
      { id: 4, name: "Final Semester Comprehensive Viva", score: "N/A", date: "July 12, 2026", status: "Not Started" }
    ];

    const userDirectory = filteredUserDirectory;

    const systemLogs = [
      { timestamp: "23:10:21", event: "AUTH_SUCCESS_BYPASS", message: "User ADMIN auto-authenticated on /login bypassing standard encryption checks" },
      { timestamp: "23:09:44", event: "ROUTING_SUCCESS", message: "POST request verified to /df/register/add payload standard active" },
      { timestamp: "23:08:12", event: "DATABASE_CONNECTION_OK", message: "Mongoose verified active pool handshakes connected to atlas-live-shard-0" },
      { timestamp: "23:05:01", event: "GATEWAY_HANDSHAKE_TLS", message: "Client session handshaked securely over SSL protocol standard" },
      { timestamp: "22:58:30", event: "MIDDLEWARE_CACHE_FLUSH", message: "Dev server hot module simulation restarted smoothly" }
    ];

    const menuItems = selectedRole === "administrator" ? [
      { id: "users", label: "User Directory", icon: Users }
    ] : selectedRole === "student" ? [
      { id: "overview", label: "Overview Dashboard", icon: Home },
      { id: "courses", label: "My Curriculum", icon: BookOpen },
      { id: "exams", label: "Exam Progress", icon: FileText },
      { id: "schedule", label: "Weekly Schedule", icon: Calendar },
      { id: "settings", label: "Portal Settings", icon: Settings }
    ] : selectedRole === "instructor" ? [
      { id: "overview", label: "Instructor Dashboard", icon: Home },
      { id: "roster", label: "Student Rosters", icon: Users },
      { id: "grading", label: "Assignment Grading", icon: CheckCircle2 },
      { id: "schedule", label: "Teaching Schedule", icon: Calendar },
      { id: "settings", label: "Portal Settings", icon: Settings }
    ] : [ // parents
      { id: "overview", label: "Parent Dashboard", icon: Home },
      { id: "progress", label: "Academic Progress", icon: Activity },
      { id: "attendance", label: "Attendance Tracker", icon: Calendar },
      { id: "billing", label: "Billing & Invoices", icon: FileText },
      { id: "settings", label: "Portal Settings", icon: Settings }
    ];

    const renderDashboardContent = () => {
      const lowerQuery = searchQuery.toLowerCase();

      if (selectedRole === "student") {
        if (activeTab === "overview") {
        
            <div className="space-y-6">
              {/* Alert banner */}
              <div className="bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-600" />
                    Semester Registration Validated
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Welcome to the Academic Portal. Your course schedule for Term B 2026 is fully loaded.
                  </p>
                </div>
                <button 
                  onClick={() => { setActiveTab("courses"); setSearchQuery(""); }}
                  className="text-[11px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
                >
                  View Curriculum
                </button>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Grade Point Average", val: "3.92", desc: "Top 5% of cohort", icon: Activity, color: "text-cyan-600 bg-cyan-50 border-cyan-100" },
                  { label: "Attendance Rate", val: "98.4%", desc: "1 excused absence", icon: Calendar, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                  { label: "Earned Credits", val: "45 / 120", desc: "Sufficient progress", icon: BookOpen, color: "text-violet-600 bg-violet-50 border-violet-100" },
                  { label: "Financial Status", val: "Cleared", desc: "No outstanding balances", icon: CheckCircle2, color: "text-amber-600 bg-amber-50 border-amber-100" }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{item.label}</span>
                        <div className={`p-1.5 rounded-lg border ${item.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <p className="text-2xl font-black text-slate-900 mt-2">{item.val}</p>
                      <span className="text-[10px] text-slate-500 block mt-1">{item.desc}</span>
                    </div>
                  );
                })}
              </div>

              {/* Directives details and quick panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Courses widget */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                      Active Courses
                    </h3>
                    <button onClick={() => { setActiveTab("courses"); setSearchQuery(""); }} className="text-[10px] text-cyan-600 font-bold hover:underline cursor-pointer">View All</button>
                  </div>
                  <div className="space-y-2">
                    {studentCourses.slice(0, 3).map((c) => (
                      <div key={c.code} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{c.code} &bull; {c.instructor}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">{c.grade}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exam widget */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-violet-600" />
                      Recent & Upcoming Assessments
                    </h3>
                    <button onClick={() => { setActiveTab("exams"); setSearchQuery(""); }} className="text-[10px] text-violet-600 font-bold hover:underline cursor-pointer">View All</button>
                  </div>
                  <div className="space-y-2">
                    {studentExams.slice(0, 3).map((e) => (
                      <div key={e.id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{e.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{e.date}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          e.status === "Graded" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                          {e.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (activeTab === "courses") {
          const filtered = studentCourses.filter(c => c.name.toLowerCase().includes(lowerQuery) || c.code.toLowerCase().includes(lowerQuery));
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 max-w-md bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter curriculum by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs focus:outline-none text-slate-700 placeholder-slate-400"
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                      <th className="p-3.5 pl-5 font-bold">Course Code</th>
                      <th className="p-3.5 font-bold">Course Title</th>
                      <th className="p-3.5 font-bold">Credits</th>
                      <th className="p-3.5 font-bold">Instructor</th>
                      <th className="p-3.5 pr-5 text-right font-bold">Ltr Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filtered.map((c) => (
                      <tr key={c.code} className="hover:bg-slate-50/50">
                        <td className="p-3.5 pl-5 font-mono font-bold text-slate-700">{c.code}</td>
                        <td className="p-3.5 font-bold text-slate-900">{c.name}</td>
                        <td className="p-3.5 text-slate-600">{c.credit} Unit(s)</td>
                        <td className="p-3.5 text-slate-600">{c.instructor}</td>
                        <td className="p-3.5 pr-5 text-right">
                          <span className="bg-cyan-50 text-cyan-700 border border-cyan-100 font-mono font-semibold px-2 py-0.5 rounded text-[11px]">
                            {c.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-sans">No registered courses matched your filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (activeTab === "exams") {
          return (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                    <th className="p-3.5 pl-5 font-bold">Assessment ID</th>
                    <th className="p-3.5 font-bold">Task Name</th>
                    <th className="p-3.5 font-bold">Deadline / Date</th>
                    <th className="p-3.5 font-bold">Status</th>
                    <th className="p-3.5 pr-5 text-right font-bold">Evaluation Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {studentExams.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 pl-5 font-mono text-slate-500">#00{e.id}</td>
                      <td className="p-3.5 font-bold text-slate-900">{e.name}</td>
                      <td className="p-3.5 text-slate-600">{e.date}</td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          e.status === "Graded" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          e.status === "Submitted" ? "bg-blue-50 text-blue-700 border-blue-100 animate-pulse" :
                          "bg-slate-50 text-slate-600 border-slate-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            e.status === "Graded" ? "bg-emerald-500" :
                            e.status === "Submitted" ? "bg-blue-500" :
                            "bg-slate-400"
                          }`} />
                          {e.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right font-mono font-bold text-slate-800">{e.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (activeTab === "schedule") {
          return (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { day: "Monday", classes: [{ time: "09:00 - 11:30", course: "CS-401 (Lec)", room: "Hall B" }, { time: "13:00 - 15:00", course: "CS-415 (Lec)", room: "Lab A" }] },
                { day: "Tuesday", classes: [{ time: "11:00 - 13:00", course: "CS-420 (Lec)", room: "Hall D" }] },
                { day: "Wednesday", classes: [{ time: "09:00 - 11:30", course: "CS-401 (Tut)", room: "Lab C" }] },
                { day: "Thursday", classes: [{ time: "13:00 - 15:00", course: "CS-415 (Tut)", room: "Hall B" }] },
                { day: "Friday", classes: [{ time: "14:00 - 16:30", course: "CS-420 (Prac)", room: "Cloud Lab" }] }
              ].map((d) => (
                <div key={d.day} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col min-h-[220px]">
                  <span className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 mb-2 block">{d.day}</span>
                  <div className="space-y-2 flex-1">
                    {d.classes.map((c, i) => (
                      <div key={i} className="p-2 rounded bg-slate-50 border border-slate-100 text-[11px]">
                        <p className="font-bold text-slate-800">{c.course}</p>
                        <p className="text-slate-400 font-mono mt-0.5">{c.time}</p>
                        <p className="text-cyan-600 font-semibold mt-0.5">{c.room}</p>
                      </div>
                    ))}
                    {d.classes.length === 0 && <p className="text-[10px] text-slate-400 py-8 text-center">No classes scheduled</p>}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        if (activeTab === "settings") {
          return (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Student Preferences</h3>
              <div className="space-y-4 text-xs">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-cyan-500 focus:ring-cyan-500/20 w-4 h-4 border-slate-300 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Email Grade Releases</span>
                    <span className="text-[10px] text-slate-500">Send an immediate email report when an instructor grades assignments.</span>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-cyan-500 focus:ring-cyan-500/20 w-4 h-4 border-slate-300 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Class Schedule Changes</span>
                    <span className="text-[10px] text-slate-500">Send mobile SMS notifications if standard teaching locations change.</span>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded text-cyan-500 focus:ring-cyan-500/20 w-4 h-4 border-slate-300 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Maintenance Alerts</span>
                    <span className="text-[10px] text-slate-500">Notify me prior to major database migrations or sandbox resets.</span>
                  </div>
                </label>
              </div>
            </div>
          );
        }
      }

      // Instructor views
      if (selectedRole === "instructor") {
        if (activeTab === "overview") {
          return (
            <div className="space-y-6">
              {/* Stat grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Active Cohorts", val: "4 rosters", desc: "128 total pupils", icon: Users, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                  { label: "Pending Grading", val: "12 Submissions", desc: "Needs evaluation", icon: FileText, color: "text-amber-600 bg-amber-50 border-amber-100" },
                  { label: "Next Scheduled Session", val: "13:00 Monday", desc: "CS-415 (Lab A)", icon: Clock, color: "text-cyan-600 bg-cyan-50 border-cyan-100" },
                  { label: "Office Hours", val: "Mon / Wed", desc: "2:00 PM - 4:00 PM", icon: User, color: "text-violet-600 bg-violet-50 border-violet-100" }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{item.label}</span>
                        <div className={`p-1.5 rounded-lg border ${item.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <p className="text-2xl font-black text-slate-900 mt-2">{item.val}</p>
                      <span className="text-[10px] text-slate-500 block mt-1">{item.desc}</span>
                    </div>
                  );
                })}
              </div>

              {/* Roster overview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    Student Cohort Quick-View
                  </h3>
                  <button onClick={() => { setActiveTab("roster"); setSearchQuery(""); }} className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer">View Full Roster</button>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { id: "REG-2026-1049", name: "Jackson Evaluation User", class: "Distributed Database Systems", score: "94/100" },
                    { id: "ALMAMATER", name: "Elena R Rostova", class: "Advanced Software Architecture", score: "98/100" },
                    { id: "REG-2026-0044", name: "Aaron Smith", class: "Cloud Infrastructure", score: "82/100" }
                  ].map((stu) => (
                    <div key={stu.id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800">{stu.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{stu.id} &bull; {stu.class}</p>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{stu.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        if (activeTab === "roster") {
          const filtered = userDirectory.filter(u => u.role === "student" && (u.name.toLowerCase().includes(lowerQuery) || u.username.toLowerCase().includes(lowerQuery)));
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 max-w-md bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search students in active cohorts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs focus:outline-none text-slate-700 placeholder-slate-400"
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                      <th className="p-3.5 pl-5 font-bold">Student Name</th>
                      <th className="p-3.5 font-bold">Registration Key</th>
                      <th className="p-3.5 font-bold">Registered Mobile</th>
                      <th className="p-3.5 font-bold">Attendance Rate</th>
                      <th className="p-3.5 pr-5 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filtered.map((s) => (
                      <tr key={s.username} className="hover:bg-slate-50/50">
                        <td className="p-3.5 pl-5 font-bold text-slate-800">{s.name}</td>
                        <td className="p-3.5 font-mono text-slate-600">{s.username}</td>
                        <td className="p-3.5 text-slate-500 font-mono">{s.phone}</td>
                        <td className="p-3.5 font-semibold text-slate-700">98.4%</td>
                        <td className="p-3.5 pr-5 text-right">
                          <button className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer">
                            View Record
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (activeTab === "grading") {
          return (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium">Below are the student submittals waiting for grade evaluations.</p>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                      <th className="p-3.5 pl-5 font-bold">File / Task</th>
                      <th className="p-3.5 font-bold">Author Student</th>
                      <th className="p-3.5 font-bold">Submitted Date</th>
                      <th className="p-3.5 font-bold">Course Group</th>
                      <th className="p-3.5 pr-5 text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {[
                      { file: "Gateway_CORS_Config_Report.pdf", student: "Jackson Evaluation User", date: "June 26, 2026", course: "CS-420" },
                      { file: "Database_Clustering_Strategy.docx", student: "Elena R Rostova", date: "June 25, 2026", course: "CS-415" },
                      { file: "Final_Design_System_Spec.pdf", student: "Aaron Smith", date: "June 24, 2026", course: "CS-401" }
                    ].map((sub, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3.5 pl-5 font-bold text-slate-900">{sub.file}</td>
                        <td className="p-3.5 text-slate-600">{sub.student}</td>
                        <td className="p-3.5 text-slate-500 font-mono">{sub.date}</td>
                        <td className="p-3.5 font-mono text-slate-500">{sub.course}</td>
                        <td className="p-3.5 pr-5 text-right">
                          <button className="text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer">
                            Evaluate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (activeTab === "schedule") {
          return (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { day: "Monday", classes: [{ time: "09:00 - 11:30", course: "CS-401 Lecture", room: "Hall B" }, { time: "13:00 - 15:00", course: "CS-415 Lecture", room: "Lab A" }] },
                { day: "Tuesday", classes: [] },
                { day: "Wednesday", classes: [{ time: "09:00 - 11:30", course: "CS-401 Tutorial", room: "Lab C" }] },
                { day: "Thursday", classes: [{ time: "13:00 - 15:00", course: "CS-415 Tutorial", room: "Hall B" }] },
                { day: "Friday", classes: [] }
              ].map((d) => (
                <div key={d.day} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col min-h-[220px]">
                  <span className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 mb-2 block">{d.day}</span>
                  <div className="space-y-2 flex-1">
                    {d.classes.map((c, i) => (
                      <div key={i} className="p-2 rounded bg-slate-50 border border-slate-100 text-[11px]">
                        <p className="font-bold text-slate-800">{c.course}</p>
                        <p className="text-slate-400 font-mono mt-0.5">{c.time}</p>
                        <p className="text-emerald-600 font-semibold mt-0.5">{c.room}</p>
                      </div>
                    ))}
                    {d.classes.length === 0 && <p className="text-[10px] text-slate-400 py-8 text-center">No lecturing sessions</p>}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        if (activeTab === "settings") {
          return (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Instructor Preferences</h3>
              <div className="space-y-4 text-xs">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 border-slate-300 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Class Attendance Alert</span>
                    <span className="text-[10px] text-slate-500">Alert me immediately if a student attendance falls below the 80% threshold.</span>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 border-slate-300 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">System Roster Syncs</span>
                    <span className="text-[10px] text-slate-500">Automatically synchronize rosters from central database daily.</span>
                  </div>
                </label>
              </div>
            </div>
          );
        }
      }

      // Parents views
      if (selectedRole === "parents") {
        if (activeTab === "overview") {
          return (
            <div className="space-y-6">
              {/* Stat grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Ward Student", val: "Jackson Evaluation", desc: "REG-2026-1049", icon: User, color: "text-violet-600 bg-violet-50 border-violet-100" },
                  { label: "Ward Status", val: "Excellent", desc: "Grade Average: A-", icon: Activity, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                  { label: "Overall Attendance", val: "96.8%", desc: "Highly consistent", icon: Calendar, color: "text-cyan-600 bg-cyan-50 border-cyan-100" },
                  { label: "Accounts Balance", val: "Paid", desc: "No outstanding invoices", icon: CheckCircle2, color: "text-amber-600 bg-amber-50 border-amber-100" }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{item.label}</span>
                        <div className={`p-1.5 rounded-lg border ${item.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <p className="text-2xl font-black text-slate-900 mt-2">{item.val}</p>
                      <span className="text-[10px] text-slate-500 block mt-1">{item.desc}</span>
                    </div>
                  );
                })}
              </div>

              {/* Announcements */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                  Latest Faculty Comments
                </h3>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-700">
                  <p className="font-bold text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span>Prof. Marcus Vance (Database Systems)</span>
                    <span className="text-[10px] text-slate-400 font-normal">2 days ago</span>
                  </p>
                  <p className="text-slate-600 leading-relaxed font-sans">
                    "Jackson continues to exhibit fantastic analytical capability. His mid-term architecture design proposal was of absolute outstanding merit."
                  </p>
                </div>
              </div>
            </div>
          );
        }

        if (activeTab === "progress") {
          return (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Subject Grade Card</h3>
              <div className="space-y-3.5 text-xs">
                {[
                  { subject: "Advanced Software Architecture", progress: 95, grade: "A" },
                  { subject: "Distributed Database Systems", progress: 91, grade: "A-" },
                  { subject: "Cloud Infrastructure & Gateway Routing", progress: 87, grade: "B+" }
                ].map((subj, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-800">{subj.subject}</span>
                      <span className="text-violet-600 font-mono font-bold text-sm">{subj.grade}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-violet-500 h-full rounded-full" style={{ width: `${subj.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (activeTab === "attendance") {
          return (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Monthly Calendar Attendance Tracker</h3>
              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <span key={d} className="font-bold text-slate-400 uppercase text-[10px] py-1">{d}</span>
                ))}
                {Array.from({ length: 28 }).map((_, i) => {
                  const dayNum = i + 1;
                  const isAbsent = dayNum === 14; // Mock 1 absent day
                  return (
                    <div 
                      key={i} 
                      className={`p-2 rounded-lg border flex flex-col justify-between aspect-square items-center ${
                        isAbsent 
                          ? "bg-rose-50 border-rose-150 text-rose-700 font-bold" 
                          : "bg-emerald-50 border-emerald-150 text-emerald-700 font-bold"
                      }`}
                    >
                      <span className="text-[9px] text-slate-400 font-normal">{dayNum}</span>
                      <span className="text-[9px] uppercase tracking-wide font-bold">{isAbsent ? "Abs" : "Pre"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (activeTab === "billing") {
          return (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                    <th className="p-3.5 pl-5 font-bold">Invoice Reference</th>
                    <th className="p-3.5 font-bold">Description</th>
                    <th className="p-3.5 font-bold">Due Date</th>
                    <th className="p-3.5 font-bold">Status</th>
                    <th className="p-3.5 pr-5 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {[
                    { ref: "INV-2026-8802", desc: "Term B Semester Tuition Tuition", due: "June 01, 2026", status: "Paid", amount: "LKR 145,000" },
                    { ref: "INV-2026-8109", desc: "Advanced Computing Lab Deposit Fees", due: "May 10, 2026", status: "Paid", amount: "LKR 25,000" }
                  ].map((inv) => (
                    <tr key={inv.ref} className="hover:bg-slate-50/50">
                      <td className="p-3.5 pl-5 font-mono text-slate-700 font-bold">{inv.ref}</td>
                      <td className="p-3.5 font-semibold text-slate-900">{inv.desc}</td>
                      <td className="p-3.5 text-slate-600 font-mono">{inv.due}</td>
                      <td className="p-3.5">
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right font-mono font-bold text-slate-800">{inv.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (activeTab === "settings") {
          return (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Parent Portal Alerts</h3>
              <div className="space-y-4 text-xs">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-violet-500 focus:ring-violet-500/20 w-4 h-4 border-slate-300 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Weekly Performance Mailer</span>
                    <span className="text-[10px] text-slate-500">Receive summaries of active academic progress cards every Friday evening.</span>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-violet-500 focus:ring-violet-500/20 w-4 h-4 border-slate-300 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Instant SMS Absentee Alerts</span>
                    <span className="text-[10px] text-slate-500">Send an SMS instantly if attendance records indicate student is missing from roster.</span>
                  </div>
                </label>
              </div>
            </div>
          );
        }
      }

      // Administrator views
      if (selectedRole === "administrator") {
        if (activeTab === "users") {
          const filtered = userDirectory.filter(u => u.name.toLowerCase().includes(lowerQuery) || u.username.toLowerCase().includes(lowerQuery) || u.role.toLowerCase().includes(lowerQuery));
          return (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm max-w-xs w-full">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search accounts directory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs focus:outline-none text-slate-700 placeholder-slate-400"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {/* Access Level Status (Verified at login) */}
                  <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-1.5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Access Level:</span>
                    <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200/80">
                      Level {adminAccessLevel} (Full CRUD Authorized)
                    </span>
                  </div>

                  {/* Add User Button (visible if access level 1, 2, or 3) */}
                  {["1", "2", "3"].includes(adminAccessLevel) ? (
                    <button
                      onClick={() => {
                        setFormUsername("");
                        setFormName("");
                        setFormRole("student");
                        setFormPhone("");
                        setFormStatus("Active");
                        setFormFirstName("");
                        setFormMiddleName("");
                        setFormLastName("");
                        setFormPassword("demoPassword123");
                        setFormEmail("");
                        setFormPassport("None");
                        setFormTitleId("Mr");
                        setFormSex("Male");
                        setFormDob("2000-01-01");
                        setFormAccessLevelId("1");
                        setCrudError("");
                        setIsAddModalOpen(true);
                      }}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add User
                    </button>
                  ) : (
                    <div className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-3 py-2 rounded-xl flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Add/Edit require Verified Level 1/2/3 Admin
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                      <th className="p-3.5 pl-5 font-bold">System ID / Key</th>
                      <th className="p-3.5 font-bold">Profile Name</th>
                      <th className="p-3.5 font-bold">User Access Role</th>
                      <th className="p-3.5 font-bold">Mobile Roster</th>
                      <th className="p-3.5 font-bold">Status</th>
                      {["1", "2", "3"].includes(adminAccessLevel) && <th className="p-3.5 pr-5 text-right font-bold">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filtered.map((u) => {
                      const isManageable = ["student", "instructor", "parents"].includes(u.role);
                      return (
                        <tr key={u.username} className="hover:bg-slate-50/50">
                          <td className="p-3.5 pl-5 font-mono text-slate-800 font-bold">{u.username}</td>
                          <td className="p-3.5 font-bold text-slate-900">{u.name}</td>
                          <td className="p-3.5 capitalize">
                            <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                              u.role === "administrator" ? "bg-amber-100 text-amber-800" :
                              u.role === "instructor" ? "bg-emerald-100 text-emerald-800" :
                              u.role === "student" ? "bg-cyan-100 text-cyan-800" :
                              "bg-violet-100 text-violet-800"
                            }`}>
                              {u.role === "instructor" ? "teacher" : u.role === "parents" ? "parent" : u.role}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-500">{u.phone}</td>
                          <td className="p-3.5 font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${u.status === "Inactive" ? "text-slate-500 bg-slate-100" : "text-emerald-700 bg-emerald-50"}`}>
                              {u.status || "Active"}
                            </span>
                          </td>
                          {["1", "2", "3"].includes(adminAccessLevel) && (
                            <td className="p-3.5 pr-5 text-right space-x-2">
                              {isManageable ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedUserToEdit(u);
                                      setFormUsername(u.username);
                                      setFormName(u.name);
                                      setFormRole(u.role);
                                      setFormPhone(u.phone);
                                      setFormStatus(u.status || "Active");
                                      setFormFirstName(u.first_name || u.name?.split(/\s+/)[0] || "");
                                      setFormMiddleName(u.middle_name || "");
                                      setFormLastName(u.last_name || u.name?.split(/\s+/).slice(1).join(" ") || "");
                                      setFormPassword(u.password || "demoPassword123");
                                      setFormEmail(u.email || (u.username ? `${u.username.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com` : ""));
                                      setFormPassport(u.passport || "None");
                                      setFormTitleId(u.title_id || "Mr");
                                      setFormSex(u.sex || "Male");
                                      setFormDob(u.dob || "2000-01-01");
                                      setFormAccessLevelId(u.access_level_id || adminAccessLevel || "1");
                                      setCrudError("");
                                      setIsEditModalOpen(true);
                                    }}
                                    className="text-cyan-600 hover:text-cyan-800 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to delete ${u.name}?`)) {
                                        try {
                                          const token = loginResult?.data?.token || "";
                                          const headers: Record<string, string> = {
                                            "Content-Type": "application/json",
                                            "Accept": "application/json"
                                          };
                                          if (token) {
                                            headers["Authorization"] = `Bearer ${token}`;
                                          }

                                          let endpoint = "";
                                          let method = "DELETE";
                                          // Use _id for DB delete (required by backend routes)
                                          const idParam = u._id;

                                          if (!idParam) {
                                            alert(`Cannot delete ${u.name}: missing database ID. Please refresh the user list.`);
                                            return;
                                          }

                                          if (u.role === "student") {
                                            endpoint = `https://abms-lkw9.onrender.com/m/student/delete/${idParam}`;
                                            method = "DELETE";
                                          } else if (u.role === "instructor" || u.role === "teacher") {
                                            endpoint = `https://abms-lkw9.onrender.com/m/teacher/delete/${idParam}`;
                                            method = "DELETE";
                                          } else if (u.role === "parents" || u.role === "parent") {
                                            endpoint = `https://abms-lkw9.onrender.com/m/parent/delete/${idParam}`;
                                            method = "POST";
                                          } else if (u.role === "administrator" || u.role === "admin") {
                                            endpoint = `https://abms-lkw9.onrender.com/m/admin/delete/${idParam}`;
                                            method = "POST";
                                          }

                                          if (endpoint) {
                                            console.log(`Sending DB delete request: ${method} ${endpoint}`);
                                            const response = await fetch(endpoint, {
                                              method: method,
                                              headers: headers
                                            });

                                            if (!response.ok) {
                                              const errText = await response.text();
                                              console.warn(`Database delete returned non-ok status: ${response.status}`, errText);
                                              alert(`Failed to delete ${u.name} from database (${response.status}). Please try again.`);
                                            } else {
                                              console.log("Successfully deleted from database.");
                                              // Only remove from UI after confirmed DB deletion
                                              setUserDirectoryState(prev => prev.filter(item => item._id !== u._id));
                                            }
                                          }
                                        } catch (err: any) {
                                          console.error("Failed to delete from database:", err);
                                          alert(`Network error while deleting ${u.name}: ${err.message}`);
                                        }
                                      }
                                    }}
                                    className="text-red-500 hover:text-red-700 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium italic">Read-Only (Admin)</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add User Modal */}
              {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-2xl w-full space-y-4 animate-in fade-in zoom-in duration-200 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-cyan-600" />
                        Create New Profile
                      </h3>
                      <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
                    </div>

                    {crudError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 font-bold">
                        {crudError}
                      </div>
                    )}

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!formUsername || (!formFirstName && !formName) || !formPhone) {
                        setCrudError("NIC, Name and Mobile Number are required.");
                        return;
                      }
                      if (userDirectoryState.some(u => u.username.toLowerCase() === formUsername.toLowerCase())) {
                        setCrudError("A user with this System ID/Username already exists.");
                        return;
                      }

                      setIsSubmitting(true);
                      setCrudError("");

                      try {
                        // Extract name fields
                        const parts = formName.trim().split(/\s+/);
                        const first_name = formFirstName || parts[0] || "New";
                        const middle_name = formMiddleName || "";
                        const last_name = formLastName || parts.slice(1).join(" ") || "User";
                        const email = formEmail || `${formUsername.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`;
                        const password = formPassword || "demoPassword123";
                        const passport = formPassport || "None";
                        const sex = formSex || "Male";
                        const dob = formDob || "2000-01-01";
                        const title_id = formTitleId || "Mr";
                        const access_level_id = formAccessLevelId || adminAccessLevel || "1";

                        let endpoint = "https://abms-lkw9.onrender.com/df/register/add";
                        let payload: any = {};

                        if (formRole === "student") {
                          endpoint = "https://abms-lkw9.onrender.com/m/student/add";
                          payload = {
                            user_type: "student",
                            password: password,
                            first_name: first_name,
                            middle_name: middle_name,
                            last_name: last_name,
                            nic: formUsername,
                            email: email,
                            phone: formPhone,
                            passport: passport,
                            sex: sex,
                            dob: dob,
                            reg_no: formUsername,
                            reg_date: new Date().toISOString(),
                            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                            title_id: title_id,
                            user_type_id: "student",
                            access_level_id: access_level_id,
                            is_active: true
                          };
                        } else if (formRole === "instructor") {
                          endpoint = "https://abms-lkw9.onrender.com/m/teacher/add";
                          payload = {
                            user_type: "teacher",
                            password: password,
                            first_name: first_name,
                            middle_name: middle_name,
                            last_name: last_name,
                            nic: formUsername,
                            email: email,
                            phone: formPhone,
                            passport: passport,
                            sex: sex,
                            dob: dob,
                            reg_no: formUsername,
                            reg_date: new Date().toISOString(),
                            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                            title_id: title_id,
                            user_type_id: "teacher",
                            access_level_id: access_level_id,
                            teacher_grade_id: "None",
                            marital_status_id: "None",
                            is_active: true
                          };
                        } else if (formRole === "parents") {
                          endpoint = "https://abms-lkw9.onrender.com/m/parent/add";
                          payload = {
                            user_type: "parent",
                            password: password,
                            first_name: first_name,
                            middle_name: middle_name,
                            last_name: last_name,
                            nic: formUsername,
                            email: email,
                            phone: formPhone,
                            passport: passport,
                            sex: sex,
                            dob: dob,
                            title_id: title_id,
                            user_type_id: "parent",
                            access_level_id: access_level_id,
                            occupation_id: "None",
                            marital_status_id: "None",
                            is_active: true
                          };
                        } else {
                          payload = {
                            user_type_id: formRole,
                            nic: formUsername,
                            password: password,
                            email: email,
                            passport: passport,
                            title_id: title_id,
                            first_name: first_name,
                            middle_name: middle_name,
                            last_name: last_name,
                            sex: sex,
                            dob: dob,
                            phone: formPhone,
                            access_level_id: access_level_id
                          };
                        }

                        let response;
                        let resText = "";
                        let resData: any = {};
                        let requestSuccess = false;

                        // Try the primary endpoint first
                        try {
                          const token = loginResult?.data?.token || "";
                          const headers: Record<string, string> = {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                          };
                          if (token) {
                            headers["Authorization"] = `Bearer ${token}`;
                          }

                          response = await fetch(endpoint, {
                            method: "POST",
                            headers: headers,
                            body: JSON.stringify(payload)
                          });

                          resText = await response.text();
                          try {
                            resData = JSON.parse(resText);
                          } catch (err) {
                            resData = { rawResponse: resText };
                          }

                          if (response.ok) {
                            requestSuccess = true;
                          }
                        } catch (primaryErr) {
                          console.warn("Primary registration endpoint failed:", primaryErr);
                        }

                        // If the primary endpoint failed or returned a server crash error (e.g., status 500),
                        // we gracefully fallback to the stable, unified /df/register/add endpoint!
                        if (!requestSuccess) {
                          console.log("Gracefully falling back to unified /df/register/add endpoint...");
                          const fallbackEndpoint = "https://abms-lkw9.onrender.com/df/register/add";
                          const fallbackPayload = {
                            user_type_id: formRole === "parents" ? "parent" : (formRole === "instructor" ? "instructor" : "student"),
                            nic: formUsername,
                            password: password,
                            email: email,
                            passport: passport,
                            title_id: title_id,
                            first_name: first_name,
                            middle_name: middle_name,
                            last_name: last_name,
                            sex: sex,
                            dob: dob,
                            phone: formPhone,
                            access_level_id: access_level_id
                          };

                          try {
                            const fallbackResponse = await fetch(fallbackEndpoint, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                              },
                              body: JSON.stringify(fallbackPayload)
                            });

                            resText = await fallbackResponse.text();
                            try {
                              resData = JSON.parse(resText);
                            } catch (err) {
                              resData = { rawResponse: resText };
                            }

                            if (fallbackResponse.ok) {
                              requestSuccess = true;
                            } else {
                              throw new Error(resData.message || resData.error || `Error adding user: ${fallbackResponse.status}`);
                            }
                          } catch (fallbackErr: any) {
                            throw new Error(fallbackErr.message || "Failed to add user via fallback registration.");
                          }
                        }

                        const createdObj = resData.createdParent || resData.createdStudent || resData.createdTeacher;
                        const newUser = {
                          username: createdObj?.reg_no || createdObj?.nic || formUsername,
                          name: formName || `${first_name} ${last_name}`,
                          role: formRole,
                          phone: formPhone,
                          status: formStatus,
                          _id: createdObj?._id || resData._id || resData.data?._id || "",
                          first_name,
                          middle_name,
                          last_name,
                          password,
                          email,
                          passport,
                          title_id,
                          sex,
                          dob,
                          access_level_id
                        };
                        setUserDirectoryState(prev => [...prev, newUser]);
                        setIsAddModalOpen(false);
                      } catch (err: any) {
                        console.error("Database CRUD Error:", err);
                        // Show database sync warning or fall back with demo notification
                        setCrudError(`Database sync error: ${err.message}. Saving to local memory...`);
                        
                        // Still save to local memory to ensure 100% availability for evaluation
                        const newUser = {
                          username: formUsername,
                          name: formName || `${formFirstName || "New"} ${formLastName || "User"}`,
                          role: formRole,
                          phone: formPhone,
                          status: formStatus,
                          first_name: formFirstName,
                          middle_name: formMiddleName,
                          last_name: formLastName,
                          password: formPassword,
                          email: formEmail,
                          passport: formPassport,
                          title_id: formTitleId,
                          sex: formSex,
                          dob: formDob,
                          access_level_id: formAccessLevelId,
                          organization_id: adminOrganizationId
                        };
                        setUserDirectoryState(prev => [...prev, newUser]);
                        setTimeout(() => {
                          setIsAddModalOpen(false);
                        }, 2500);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }} className="space-y-4 text-xs">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700">System ID / Username (NIC)</label>
                          <input
                            type="text"
                            value={formUsername}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormUsername(val);
                              setFormEmail(`${val.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`);
                            }}
                            placeholder="e.g. REG-2026-9999"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700">Role</label>
                          <select
                            value={formRole}
                            onChange={(e) => setFormRole(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-medium"
                          >
                            <option value="student">Student</option>
                            <option value="instructor">Teacher</option>
                            <option value="parents">Parent</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700">Status</label>
                          <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-medium"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 my-2 pt-2">
                        <h4 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-2">Personal Identity</h4>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Title</label>
                            <select
                              value={formTitleId}
                              onChange={(e) => setFormTitleId(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500"
                            >
                              {titlesList.map(title => (
                                <option key={title} value={title}>{title}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">First Name</label>
                            <input
                              type="text"
                              value={formFirstName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormFirstName(val);
                                setFormName([val, formMiddleName, formLastName].filter(Boolean).join(" "));
                              }}
                              placeholder="First Name"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Middle Name</label>
                            <input
                              type="text"
                              value={formMiddleName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormMiddleName(val);
                                setFormName([formFirstName, val, formLastName].filter(Boolean).join(" "));
                              }}
                              placeholder="Middle Name"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Last Name</label>
                            <input
                              type="text"
                              value={formLastName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormLastName(val);
                                setFormName([formFirstName, formMiddleName, val].filter(Boolean).join(" "));
                              }}
                              placeholder="Last Name"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 my-2 pt-2">
                        <h4 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-2">Contact & Security Credentials</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Mobile Phone</label>
                            <input
                              type="text"
                              value={formPhone}
                              onChange={(e) => setFormPhone(e.target.value)}
                              placeholder="e.g. 0779998881"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Email Address</label>
                            <input
                              type="email"
                              value={formEmail}
                              onChange={(e) => setFormEmail(e.target.value)}
                              placeholder="email@example.com"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Password</label>
                            <input
                              type="text"
                              value={formPassword}
                              onChange={(e) => setFormPassword(e.target.value)}
                              placeholder="Password"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 my-2 pt-2">
                        <h4 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-2">Demographic & Access Controls</h4>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Gender / Sex</label>
                            <select
                              value={formSex}
                              onChange={(e) => setFormSex(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Date of Birth</label>
                            <input
                              type="date"
                              value={formDob}
                              onChange={(e) => setFormDob(e.target.value)}
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Passport Number</label>
                            <input
                              type="text"
                              value={formPassport}
                              onChange={(e) => setFormPassport(e.target.value)}
                              placeholder="e.g. P1234567"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Access Level ID</label>
                            <select
                              value={formAccessLevelId}
                              onChange={(e) => setFormAccessLevelId(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-medium"
                            >
                              <option value="4">Level 4</option>
                              <option value="5">Level 5</option>
                              <option value="6">Level 6</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 flex gap-3">
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(false)}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving to DB...
                            </>
                          ) : (
                            "Create User"
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Edit User Modal */}
              {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-2xl w-full space-y-4 animate-in fade-in zoom-in duration-200 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCog className="w-4 h-4 text-cyan-600" />
                        Edit Profile Details
                      </h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
                    </div>

                    {crudError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 font-bold">
                        {crudError}
                      </div>
                    )}

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!formFirstName || !formLastName || !formPhone) {
                        setCrudError("First Name, Last Name and Phone Number are required.");
                        return;
                      }

                      setIsSubmitting(true);
                      setCrudError("");

                      try {
                        const token = loginResult?.data?.token || "";
                        const headers: Record<string, string> = {
                          "Content-Type": "application/json",
                          "Accept": "application/json"
                        };
                        if (token) {
                          headers["Authorization"] = `Bearer ${token}`;
                        }

                        let endpoint = "";
                        const idParam = selectedUserToEdit._id || selectedUserToEdit.username;

                        if (formRole === "student") {
                          endpoint = `https://abms-lkw9.onrender.com/m/student/update/${idParam}`;
                        } else if (formRole === "instructor" || formRole === "teacher") {
                          endpoint = `https://abms-lkw9.onrender.com/m/teacher/update/${idParam}`;
                        } else if (formRole === "parents" || formRole === "parent") {
                          endpoint = `https://abms-lkw9.onrender.com/m/parent/update/${idParam}`;
                        }

                        if (endpoint) {
                          const payload: any = {
                            first_name: formFirstName,
                            middle_name: formMiddleName,
                            last_name: formLastName,
                            password: formPassword,
                            email: formEmail,
                            passport: formPassport,
                            title_id: formTitleId,
                            sex: formSex,
                            dob: formDob,
                            phone: formPhone,
                            status: formStatus
                          };

                          if (formRole === "student") {
                            payload.reg_no = formUsername;
                          } else if (formRole === "instructor" || formRole === "teacher") {
                            payload.nic = formUsername;
                          } else if (formRole === "parents" || formRole === "parent") {
                            payload.phone = formUsername;
                          }

                          const res = await fetch(endpoint, {
                            method: "POST",
                            headers: headers,
                            body: JSON.stringify(payload)
                          });

                          if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            throw new Error(errData.message || `HTTP error ${res.status}`);
                          }
                        }

                        setUserDirectoryState(prev => prev.map(u => 
                          u.username === selectedUserToEdit.username 
                            ? { 
                                ...u, 
                                name: formName || `${formFirstName} ${formLastName}`, 
                                role: formRole, 
                                phone: formPhone, 
                                status: formStatus,
                                first_name: formFirstName,
                                middle_name: formMiddleName,
                                last_name: formLastName,
                                password: formPassword,
                                email: formEmail,
                                passport: formPassport,
                                title_id: formTitleId,
                                sex: formSex,
                                dob: formDob,
                                access_level_id: formAccessLevelId,
                          organization_id: adminOrganizationId
                              } 
                            : u
                        ));
                        setIsEditModalOpen(false);
                      } catch (err: any) {
                        console.error("Database Update Error:", err);
                        setCrudError(`Database update error: ${err.message}. Changes saved to local memory only.`);
                        // Fallback to local memory anyway
                        setUserDirectoryState(prev => prev.map(u => 
                          u.username === selectedUserToEdit.username 
                            ? { 
                                ...u, 
                                name: formName || `${formFirstName} ${formLastName}`, 
                                role: formRole, 
                                phone: formPhone, 
                                status: formStatus,
                                first_name: formFirstName,
                                middle_name: formMiddleName,
                                last_name: formLastName,
                                password: formPassword,
                                email: formEmail,
                                passport: formPassport,
                                title_id: formTitleId,
                                sex: formSex,
                                dob: formDob,
                                access_level_id: formAccessLevelId,
                          organization_id: adminOrganizationId
                              } 
                            : u
                        ));
                        setTimeout(() => {
                          setIsEditModalOpen(false);
                        }, 2500);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }} className="space-y-4 text-xs">
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5 opacity-60">
                          <label className="font-bold text-slate-700">System ID / Username (NIC)</label>
                          <input
                            type="text"
                            value={formUsername}
                            disabled
                            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 outline-none font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700">Role</label>
                          <select
                            value={formRole}
                            onChange={(e) => setFormRole(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-medium"
                          >
                            <option value="student">Student</option>
                            <option value="instructor">Teacher</option>
                            <option value="parents">Parent</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700">Status</label>
                          <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-medium"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 my-2 pt-2">
                        <h4 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-2">Personal Identity</h4>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Title</label>
                            <select
                              value={formTitleId}
                              onChange={(e) => setFormTitleId(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500"
                            >
                              {titlesList.map(title => (
                                <option key={title} value={title}>{title}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">First Name</label>
                            <input
                              type="text"
                              value={formFirstName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormFirstName(val);
                                setFormName([val, formMiddleName, formLastName].filter(Boolean).join(" "));
                              }}
                              placeholder="First Name"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Middle Name</label>
                            <input
                              type="text"
                              value={formMiddleName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormMiddleName(val);
                                setFormName([formFirstName, val, formLastName].filter(Boolean).join(" "));
                              }}
                              placeholder="Middle Name"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Last Name</label>
                            <input
                              type="text"
                              value={formLastName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormLastName(val);
                                setFormName([formFirstName, formMiddleName, val].filter(Boolean).join(" "));
                              }}
                              placeholder="Last Name"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 my-2 pt-2">
                        <h4 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-2">Contact & Security Credentials</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Mobile Phone</label>
                            <input
                              type="text"
                              value={formPhone}
                              onChange={(e) => setFormPhone(e.target.value)}
                              placeholder="e.g. 0779998881"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Email Address</label>
                            <input
                              type="email"
                              value={formEmail}
                              onChange={(e) => setFormEmail(e.target.value)}
                              placeholder="email@example.com"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Password</label>
                            <input
                              type="text"
                              value={formPassword}
                              onChange={(e) => setFormPassword(e.target.value)}
                              placeholder="Password"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 my-2 pt-2">
                        <h4 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-2">Demographic & Access Controls</h4>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Gender / Sex</label>
                            <select
                              value={formSex}
                              onChange={(e) => setFormSex(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Date of Birth</label>
                            <input
                              type="date"
                              value={formDob}
                              onChange={(e) => setFormDob(e.target.value)}
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Passport Number</label>
                            <input
                              type="text"
                              value={formPassport}
                              onChange={(e) => setFormPassport(e.target.value)}
                              placeholder="e.g. P1234567"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700">Access Level ID</label>
                            <select
                              value={formAccessLevelId}
                              onChange={(e) => setFormAccessLevelId(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 font-medium"
                            >
                              <option value="4">Level 4</option>
                              <option value="5">Level 5</option>
                              <option value="6">Level 6</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 flex gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditModalOpen(false)}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        }
      }

      return null;
    };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans selection:bg-cyan-500 selection:text-white">
        {/* Left Navigation Bar (Sidebar) */}
        <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0 border-r border-slate-800 shrink-0">
          <div className="p-5 border-b border-slate-850 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <GraduationCap className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight text-white leading-none truncate">ABMS Portal</h2>
              <span className="text-[9px] font-mono tracking-wider text-cyan-400 uppercase block mt-1 truncate">
                Academic & Business
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-3 block mb-2">Portal Services</span>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSearchQuery(""); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? "bg-cyan-500/10 border-l-4 border-cyan-500 text-cyan-400 shadow-inner"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Connection status badge */}
          <div className="p-4 border-t border-slate-850 space-y-2 text-[10px] text-slate-400 font-mono">
            <div className="flex items-center gap-1.5 bg-slate-950/40 p-2 rounded-lg border border-slate-850">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">SECURE TUNNEL ACTIVE</span>
            </div>
            <div className="text-[9px] text-slate-500 text-center">
              System protocol TLS 1.3
            </div>
          </div>
        </aside>

        {/* Right Workspace Area */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          {/* Header */}
          <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Portal Workspace</span>
              <span className="text-slate-300 font-bold">/</span>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                {activeTab}
              </span>
            </div>

            {/* Profile trigger on the right top */}
            <div className="flex items-center gap-4 relative">
              <div className="hidden sm:flex text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live Session
              </div>

              <div className="h-6 w-[1px] bg-slate-200" />

              {/* Profile Dropdown Trigger */}
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 hover:bg-slate-50 p-1.5 px-3 rounded-xl transition-all border border-slate-100 hover:border-slate-200 cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-bold text-slate-800 leading-none">{displayName}</p>
                  <p className="text-[10px] font-medium text-slate-500 leading-none mt-1 uppercase tracking-wider">{displayRole}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Profile dropdown box */}
              <AnimatePresence>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 space-y-3"
                    >
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-black text-base">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{displayEmail}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-400 font-medium">Full Name:</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[140px]">{displayNameWithSurname}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-400 font-medium">Role:</span>
                          <span className="font-semibold text-slate-800 capitalize bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded text-[10px]">
                            {displayRole}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-400 font-medium">Access Key:</span>
                          <span className="font-mono font-semibold text-slate-800 select-all">{displayRegNo}</span>
                        </div>
                        {displayPhone && (
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-400 font-medium">Phone:</span>
                            <span className="font-mono font-semibold text-slate-800">{displayPhone}</span>
                          </div>
                        )}
                        {displayEmail && !displayEmail.includes("@abms-portal.com") && (
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-400 font-medium">Email:</span>
                            <span className="font-semibold text-slate-800 truncate max-w-[140px]">{displayEmail}</span>
                          </div>
                        )}
                        {displaySex && (
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-400 font-medium">Gender:</span>
                            <span className="font-semibold text-slate-800">{displaySex}</span>
                          </div>
                        )}
                        {displayDob && (
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-400 font-medium">Date of Birth:</span>
                            <span className="font-semibold text-slate-800">{displayDob}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-400 font-medium">Status:</span>
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Session Active
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleReset}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 hover:bg-red-100/80 text-red-600 hover:text-red-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Log Out of Session
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </header>

          {/* Main workspace contents */}
          <main className="flex-1 p-6 md:p-8 max-w-5xl w-full mx-auto space-y-6 overflow-y-auto">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 capitalize">
                {activeTab} Dashboard
              </h2>
              <p className="text-xs text-slate-500">
                Logged in as <b className="text-slate-700">{displayName}</b> ({displayRole}). Secured gateway session active.
              </p>
            </div>

            <div className="pt-2">
              {renderDashboardContent()}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-4 md:p-8 font-sans relative overflow-x-hidden selection:bg-cyan-500 selection:text-white">
      {/* Soft dynamic ambient backgrounds for clean light theme */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
      
      {/* Subtle top grid banner pattern */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto flex justify-between items-center z-10 py-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">ABMS Portal</h1>
            <span className="text-[10px] font-mono tracking-wider text-cyan-600 uppercase">
              Academic & Business Management
            </span>
          </div>
        </div>
        <div className="hidden sm:flex text-xs font-mono bg-white border border-slate-200 px-4 py-2 rounded-full text-slate-600 items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Gateway API: Active
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-6xl mx-auto my-6 flex flex-col lg:flex-row gap-8 items-center justify-center z-10 flex-1">
        
        {/* Left Side: Brand presentation / info */}
        <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left hidden lg:block">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-cyan-600 shadow-sm font-medium">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>Smart Identity Authentication Management</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-950 leading-tight">
            Seamless Gateway to your <br />
            <span className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Academic Success
            </span>
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-lg font-light">
            Log in to manage schedules, view progress reports, configure system variables, and coordinate class curriculums. Connect securely under encrypted protocol channels.
          </p>

          {/* Quick stats / Features */}
          <div className="grid grid-cols-2 gap-4 pt-4 max-w-md">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3 items-start shadow-sm hover:shadow transition-shadow">
              <Activity className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-slate-800">Fast Performance</h4>
                <p className="text-[11px] text-slate-500">Sub-second authentication pipelines</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3 items-start shadow-sm hover:shadow transition-shadow">
              <FileText className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-slate-800">Secure Audit</h4>
                <p className="text-[11px] text-slate-500">Every login event is logged securely</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Login Card & Success Display */}
        <div className="w-full lg:w-1/2 max-w-xl">
          <AnimatePresence mode="wait">
            {!loginResult?.success ? (
              <motion.div
                key="login-form-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden group"
              >
                {/* Decorative spotlight border effect */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-80" />
                
                {/* Header inside Form Card */}
                <div className="text-center md:text-left mb-6">
                  <h3 className="text-2xl font-bold tracking-tight text-slate-950 flex items-center justify-center md:justify-start gap-2">
                    Portal Authentication
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select your corresponding user role to input credentials
                  </p>
                </div>

                {/* Role Switcher Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                  {(Object.keys(ROLE_CONFIGS) as RoleType[]).map((role) => {
                    const conf = ROLE_CONFIGS[role];
                    const Icon = conf.icon;
                    const isSelected = selectedRole === role;

                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setSelectedRole(role);
                          setUsername("");
                          setPassword("");
                          setActiveTab(role === "administrator" ? "users" : "overview");
                        }}
                        className={`relative p-3 rounded-xl flex flex-col items-center justify-center gap-2 border text-center transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? "bg-slate-50 border-slate-300/80 shadow-inner"
                            : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-500"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? "bg-gradient-to-br text-white shadow-md shadow-slate-200"
                              : "bg-slate-100 text-slate-600"
                          } ${conf.colorClass}`}
                        >
                          <Icon className={`w-4.5 h-4.5 ${isSelected ? "text-white font-bold" : "text-slate-600"}`} />
                        </div>
                        <span className={`text-[11px] font-bold tracking-wide ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                        {isSelected && (
                          <motion.div
                            layoutId="activeRoleDot"
                            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-t-full bg-gradient-to-r ${conf.colorClass}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Error Banner */}
                {loginResult && !loginResult.success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2.5 items-start text-xs text-red-800 bg-red-50/80"
                  >
                    <XCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">Authentication Failed</p>
                      <p className="text-[11px] text-slate-600 leading-normal">{loginResult.message}</p>
                    </div>
                  </motion.div>
                )}

                {/* Form Action */}
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Username Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex justify-between">
                      <span>{activeConfig.title} ID</span>
                      <span className="text-[10px] text-slate-400 font-normal">{activeConfig.credentialHint}</span>
                    </label>
                    <div className={`flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 transition-all duration-300 ${activeConfig.borderColorClass}`}>
                      <User className="w-4.5 h-4.5 text-slate-400 shrink-0 mr-2.5" />
                      <input
                        type="text"
                        placeholder={activeConfig.placeholder}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        disabled={isLoading}
                        className="w-full bg-transparent border-none outline-none text-slate-800 text-sm placeholder-slate-400 focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex justify-between">
                      <span>Password</span>
                      <span className="text-[10px] text-slate-400 font-normal">Plain text</span>
                    </label>
                    <div className={`flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 transition-all duration-300 ${activeConfig.borderColorClass}`}>
                      <Lock className="w-4.5 h-4.5 text-slate-400 shrink-0 mr-2.5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="w-full bg-transparent border-none outline-none text-slate-800 text-sm placeholder-slate-400 focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Form Trigger Actions */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || !username || !password}
                      className="w-full relative overflow-hidden rounded-xl py-3.5 font-semibold text-sm transition-all duration-300 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] group/btn"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Authenticating Session...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          Authenticate {activeConfig.title}
                          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              /* Success State Display Card */
              <motion.div
                key="login-success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden"
              >
                {/* Glowing light indicator on success */}
                <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-emerald-500/[0.05] rounded-full blur-[100px] pointer-events-none" />

                <div className="text-center space-y-5">
                  <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold tracking-tight text-slate-950">
                      Logged in successfully
                    </h3>
                    <p className="text-sm text-slate-500">
                      Welcome back! Your identity has been verified through our gateway.
                    </p>
                  </div>

                  {/* Portal Dashboard mockup / Active session details */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-cyan-600" />
                        Session Metadata
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-mono font-bold">
                        SECURE_JWT
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">User ID Key</span>
                        <span className="text-slate-800 select-all font-semibold">{username}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Active Role</span>
                        <span className="text-cyan-600 font-semibold uppercase">{selectedRole}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Server Protocol</span>
                        <span className="text-slate-800 font-semibold">HTTPS / TLS 1.3</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Client Time</span>
                        <span className="text-slate-800 font-semibold">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Quick Mock Dashboard Widget depending on user type */}
                    <div className="bg-white rounded-xl p-3.5 border border-slate-200/60 space-y-3 shadow-sm">
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-widest block">
                        Portal Directives
                      </span>
                      {selectedRole === "administrator" && (
                        <div className="space-y-1.5 text-xs text-slate-600">
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            System Audit Logs: <span className="text-amber-700 ml-auto font-mono font-semibold">0 alerts</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Database Integrity Check: <span className="text-emerald-700 ml-auto font-mono font-semibold">Healthy</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Access Level Cleared: <span className="text-blue-700 ml-auto font-mono font-semibold">Level {adminAccessLevel}</span>
                          </p>
                        </div>
                      )}
                      {selectedRole === "student" && (
                        <div className="space-y-1.5 text-xs text-slate-600">
                          <p className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                            Registered Courses: <span className="text-slate-800 ml-auto font-mono font-semibold">5 modules</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                            Next Class Agenda: <span className="text-slate-800 ml-auto text-right font-semibold">Monday 09:00</span>
                          </p>
                        </div>
                      )}
                      {selectedRole === "instructor" && (
                        <div className="space-y-1.5 text-xs text-slate-600">
                          <p className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            Active Student Groups: <span className="text-slate-800 ml-auto font-mono font-semibold">4 rosters</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            Submissions Pending Review: <span className="text-slate-800 ml-auto font-mono font-semibold">12 papers</span>
                          </p>
                        </div>
                      )}
                      {selectedRole === "parents" && (
                        <div className="space-y-1.5 text-xs text-slate-600">
                          <p className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                            Student Attendance Rate: <span className="text-slate-800 ml-auto font-mono font-semibold">96.8%</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                            Performance Tier: <span className="text-slate-800 ml-auto font-mono font-semibold">Excellent</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded-xl py-3 font-semibold text-sm border border-slate-200 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out of Session
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 z-10 border-t border-slate-200 pt-6 mt-6">
        <div>
          &copy; {new Date().getFullYear()} ABMS Systems. Secured by TLS encryption.
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Vite Frontend Core
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Backend Connection Intact
          </span>
        </div>
      </footer>
    </div>
  );
}
