import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Home,
  Settings,
  Bell,
  ChevronDown,
  Search,
  Clock,
  UserCog,
  Pencil,
  UserPlus,
  Link,
  Building,
  Trash2,
  X,
  Save,
  RefreshCw
} from "lucide-react";

const API_BASE = "https://abms-lkw9.onrender.com";

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

interface User {
  _id: string;
  username?: string;
  name?: string;
  role: string;
  status?: string;
  phone?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  nic?: string;
  reg_no?: string;
  organization_id?: string;
  grade_id?: string;
  section_id?: string;
}

interface Institution {
  _id: string;
  name: string;
  line1?: string;
  line2?: string;
  line3?: string;
  city?: string;
  postcode?: string;
  key?: string;
  is_active?: string;
}

interface Grade {
  _id: string;
  grade: string;
}

interface Section {
  _id: string;
  grade?: string;
  __section?: string;
  is_active?: boolean;
}

export default function App() {
  const [selectedRole, setSelectedRole] = useState<RoleType>("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginResult, setLoginResult] = useState<{
    success: boolean;
    message: string;
    data?: { token?: string; user?: any };
  } | null>(null);

  const activeConfig = ROLE_CONFIGS[selectedRole];

  // Dashboard states
  const [activeTab, setActiveTab] = useState("users");
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "student" | "instructor" | "parents">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  // Data states
  const [userDirectory, setUserDirectory] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [adminOrganizationId, setAdminOrganizationId] = useState<string | null>(null);
  const [institutionDetails, setInstitutionDetails] = useState<Institution | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [selectedUserForMapping, setSelectedUserForMapping] = useState<User | null>(null);
  const [mappingType, setMappingType] = useState<"student" | "teacher" | "parent" | null>(null);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [crudError, setCrudError] = useState("");

  // Form states
  const [formFirstName, setFormFirstName] = useState("");
  const [formMiddleName, setFormMiddleName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formRole, setFormRole] = useState("student");
  const [formPhone, setFormPhone] = useState("");
  const [formNic, setFormNic] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("demoPassword123");
  const [formRegNo, setFormRegNo] = useState("");
  const [formSex, setFormSex] = useState("Male");
  const [formDob, setFormDob] = useState("2000-01-01");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // Session persistence
  useEffect(() => {
    const savedSession = localStorage.getItem("abms_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed?.success && parsed.data?.token) {
          fetch(`${API_BASE}/login/verify`, {
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
                  data: { token: parsed.data.token, user: data.user }
                });
                if (data.user.organization_id) {
                  setAdminOrganizationId(data.user.organization_id);
                }
                const roleMap: Record<string, RoleType> = {
                  "admin": "administrator",
                  "student": "student",
                  "teacher": "instructor",
                  "parent": "parents"
                };
                if (data.user.user_type) {
                  setSelectedRole(roleMap[data.user.user_type] || "student");
                }
              } else {
                localStorage.removeItem("abms_session");
              }
            })
            .catch(() => localStorage.removeItem("abms_session"));
        }
      } catch {
        localStorage.removeItem("abms_session");
      }
    }
  }, []);

  // Fetch institutions on admin login
  useEffect(() => {
    if (loginResult?.success && selectedRole === "administrator") {
      fetchInstitutions();
      fetchGrades();
      fetchSections();
      fetchUsers();
    }
  }, [loginResult, selectedRole]);

  // Fetch institution details when adminOrganizationId changes
  useEffect(() => {
    if (adminOrganizationId) {
      fetchInstitutionDetails();
    }
  }, [adminOrganizationId]);

  const fetchInstitutions = async () => {
    try {
      const res = await fetch(`${API_BASE}/m/organization/retrieve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        setInstitutions(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setSelectedInstitution(data[0]._id);
        }
      }
    } catch (err) {
      console.error("Error fetching institutions:", err);
    }
  };

  const fetchGrades = async () => {
    try {
      const res = await fetch(`${API_BASE}/df/grade/retrieve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        setGrades(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching grades:", err);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await fetch(`${API_BASE}/m/classSection/retrieve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        setSections(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching sections:", err);
    }
  };

  const fetchUsers = async () => {
    const token = loginResult?.data?.token || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const [studentsRes, teachersRes, parentsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/m/student/retrieve`, { method: "POST", headers, body: JSON.stringify({}) }),
        fetch(`${API_BASE}/m/teacher/retrieve`, { method: "POST", headers, body: JSON.stringify({}) }),
        fetch(`${API_BASE}/m/parent/retrieve`, { method: "POST", headers, body: JSON.stringify({}) })
      ]);

      const users: User[] = [];

      if (studentsRes.status === "fulfilled" && studentsRes.value.ok) {
        const students = await studentsRes.value.json();
        if (Array.isArray(students)) {
          students.forEach((s: any) => {
            users.push({
              _id: s._id,
              username: s.reg_no || s.nic || "",
              name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Student",
              role: "student",
              status: "Active",
              phone: s.phone || "",
              first_name: s.first_name,
              last_name: s.last_name,
              email: s.email,
              nic: s.nic,
              reg_no: s.reg_no,
              organization_id: s.organization_id
            });
          });
        }
      }

      if (teachersRes.status === "fulfilled" && teachersRes.value.ok) {
        const teachers = await teachersRes.value.json();
        if (Array.isArray(teachers)) {
          teachers.forEach((t: any) => {
            users.push({
              _id: t._id,
              username: t.nic || "",
              name: `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Teacher",
              role: "instructor",
              status: "Active",
              phone: t.phone || "",
              first_name: t.first_name,
              last_name: t.last_name,
              email: t.email,
              nic: t.nic,
              organization_id: t.organization_id
            });
          });
        }
      }

      if (parentsRes.status === "fulfilled" && parentsRes.value.ok) {
        const parents = await parentsRes.value.json();
        if (Array.isArray(parents)) {
          parents.forEach((p: any) => {
            users.push({
              _id: p._id,
              username: p.phone || "",
              name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Parent",
              role: "parents",
              status: "Active",
              phone: p.phone,
              first_name: p.first_name,
              last_name: p.last_name,
              email: p.email,
              nic: p.nic,
              organization_id: p.organization_id
            });
          });
        }
      }

      setUserDirectory(users);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchInstitutionDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/m/organization/retrieve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const matched = data.find((org: any) => org._id === adminOrganizationId || org.name === adminOrganizationId);
          setInstitutionDetails(matched || data[0] || null);
        }
      }
    } catch (err) {
      console.error("Error fetching institution details:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    setLoginResult(null);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const responseData = await response.json();

      if (response.ok && responseData.status === 200) {
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
          setLoginResult({
            success: false,
            message: `Access Denied: This account is registered under the ${returnedRole} role. Please select the correct portal tab.`
          });
        } else {
          if (responseData.user?.organization_id) {
            setAdminOrganizationId(responseData.user.organization_id);
          }
          setLoginResult({
            success: true,
            message: "Login successful",
            data: { token: responseData.token, user: responseData.user }
          });
          localStorage.setItem("abms_session", JSON.stringify({
            success: true,
            data: { token: responseData.token, user: responseData.user }
          }));
          setActiveTab(selectedRole === "administrator" ? "users" : "overview");
        }
      } else {
        setLoginResult({
          success: false,
          message: responseData.message || "Authentication failed. Please check your credentials."
        });
      }
    } catch (err: any) {
      setLoginResult({
        success: false,
        message: `Network error: ${err.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setLoginResult(null);
    setUsername("");
    setPassword("");
    localStorage.removeItem("abms_session");
    setActiveTab(selectedRole === "administrator" ? "users" : "overview");
  };

  const openMappingModal = (user: User, type: "student" | "teacher" | "parent") => {
    setSelectedUserForMapping(user);
    setMappingType(type);
    setIsMappingModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUserToEdit(user);
    setFormFirstName(user.first_name || "");
    setFormMiddleName(user.middle_name || "");
    setFormLastName(user.last_name || "");
    setFormPhone(user.phone || "");
    setFormNic(user.nic || "");
    setFormEmail(user.email || "");
    setFormRole(user.role);
    setFormRegNo(user.reg_no || "");
    setCrudError("");
    setIsEditModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedUserToEdit(null);
    setFormFirstName("");
    setFormMiddleName("");
    setFormLastName("");
    setFormPhone("");
    setFormNic("");
    setFormEmail("");
    setFormRole("student");
    setFormRegNo("");
    setFormPassword("demoPassword123");
    setFormSex("Male");
    setFormDob("2000-01-01");
    setCrudError("");
    setIsAddModalOpen(true);
  };

  const handleAddUser = async () => {
    if (!formFirstName || !formLastName) {
      setCrudError("First name and last name are required");
      return;
    }
    setIsSubmitting(true);
    setCrudError("");

    const token = loginResult?.data?.token || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const endpoint = formRole === "student"
      ? `${API_BASE}/m/student/add`
      : formRole === "instructor"
        ? `${API_BASE}/m/teacher/add`
        : `${API_BASE}/m/parent/add`;

    const body: any = {
      first_name: formFirstName,
      middle_name: formMiddleName,
      last_name: formLastName,
      phone: formPhone,
      nic: formNic,
      email: formEmail,
      password: formPassword,
      sex: formSex,
      dob: formDob,
      organization_id: selectedInstitution || adminOrganizationId
    };

    if (formRole === "student") {
      body.reg_no = formRegNo || `REG-${Date.now()}`;
      body.user_type_id = "student";
      body.access_level_id = "3";
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        fetchUsers();
      } else {
        const errData = await res.json();
        setCrudError(errData.message || "Failed to add user");
      }
    } catch (err: any) {
      setCrudError(`Network error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUserToEdit || !formFirstName || !formLastName) {
      setCrudError("First name and last name are required");
      return;
    }
    setIsSubmitting(true);
    setCrudError("");

    const token = loginResult?.data?.token || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const endpoint = selectedUserToEdit.role === "student"
      ? `${API_BASE}/m/student/update/${selectedUserToEdit._id}`
      : selectedUserToEdit.role === "instructor"
        ? `${API_BASE}/m/teacher/update/${selectedUserToEdit._id}`
        : `${API_BASE}/m/parent/update/${selectedUserToEdit._id}`;

    const body = {
      first_name: formFirstName,
      middle_name: formMiddleName,
      last_name: formLastName,
      phone: formPhone,
      nic: formNic,
      email: formEmail,
      organization_id: selectedInstitution || adminOrganizationId
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchUsers();
      } else {
        const errData = await res.json();
        setCrudError(errData.message || "Failed to update user");
      }
    } catch (err: any) {
      setCrudError(`Network error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;

    const token = loginResult?.data?.token || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const endpoint = user.role === "student"
      ? `${API_BASE}/m/student/delete/${user._id}`
      : user.role === "instructor"
        ? `${API_BASE}/m/teacher/delete/${user._id}`
        : `${API_BASE}/m/parent/delete/${user._id}`;

    try {
      const res = await fetch(endpoint, { method: "DELETE", headers });
      if (res.ok) {
        setUserDirectory(prev => prev.filter(u => u._id !== user._id));
      } else {
        alert("Failed to delete user");
      }
    } catch (err) {
      alert("Network error while deleting");
    }
  };

  const handleSaveStudentMapping = async () => {
    if (!selectedUserForMapping || !selectedSection) {
      alert("Please select a section");
      return;
    }

    const token = loginResult?.data?.token || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      // Create student_class relation
      const res = await fetch(`${API_BASE}/rel/studentClass/add`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          student_id: selectedUserForMapping._id,
          class_id: selectedSection,
          reg_date: new Date().toISOString()
        })
      });

      if (res.ok) {
        setIsMappingModalOpen(false);
        setSelectedSection("");
        alert("Student mapped successfully!");
      } else {
        const errText = await res.text();
        alert(`Failed to map student: ${errText}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const filteredUsers = userDirectory.filter(u => {
    const matchesType = userTypeFilter === "all" || u.role === userTypeFilter;
    const matchesSearch = !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrg = !selectedInstitution || u.organization_id === selectedInstitution;
    return matchesType && matchesSearch && matchesOrg;
  });

  const menuItems = selectedRole === "administrator" ? [
    { id: "users", label: "User Directory", icon: Users },
    { id: "institutions", label: "Institutions", icon: Building }
  ] : selectedRole === "student" ? [
    { id: "overview", label: "Overview", icon: Home },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "grades", label: "Grades", icon: FileText },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "settings", label: "Settings", icon: Settings }
  ] : selectedRole === "instructor" ? [
    { id: "overview", label: "Overview", icon: Home },
    { id: "roster", label: "Roster", icon: Users },
    { id: "grading", label: "Grading", icon: FileText },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "settings", label: "Settings", icon: Settings }
  ] : [
    { id: "overview", label: "Overview", icon: Home },
    { id: "progress", label: "Progress", icon: Activity },
    { id: "attendance", label: "Attendance", icon: Calendar },
    { id: "billing", label: "Billing", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const renderContent = () => {
    // Users Directory
    if (activeTab === "users") {
      return (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 w-64"
                />
              </div>
              <select
                value={userTypeFilter}
                onChange={(e) => setUserTypeFilter(e.target.value as any)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="all">All Users</option>
                <option value="student">Students</option>
                <option value="instructor">Instructors</option>
                <option value="parents">Parents</option>
              </select>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 hover:shadow-xl transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Phone</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                            {user.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{user.name || "Unknown"}</p>
                            <p className="text-xs text-slate-500">{user.username || user.reg_no || user.nic}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                          user.role === "student" ? "bg-cyan-100 text-cyan-800" :
                          user.role === "instructor" ? "bg-emerald-100 text-emerald-800" :
                          user.role === "parents" ? "bg-violet-100 text-violet-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {user.role === "parents" ? "Parent" : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.email || "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.phone || "-"}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {user.status || "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-cyan-600 hover:text-cyan-800 font-bold text-xs hover:underline inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => openMappingModal(user, user.role === "instructor" ? "teacher" : user.role === "parents" ? "parent" : user.role as "student" | "teacher" | "parent")}
                            className="text-emerald-600 hover:text-emerald-800 font-bold text-xs hover:underline inline-flex items-center gap-1"
                          >
                            <Link className="w-3 h-3" />
                            Configure
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-500 hover:text-red-700 font-bold text-xs hover:underline inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No users found</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Institutions Tab
    if (activeTab === "institutions") {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3">
              <Building className="h-6 w-6 text-amber-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Institution Details</h2>
                <p className="text-xs text-slate-500 mt-1">Organization information and address details</p>
              </div>
            </div>
            <div className="p-6">
              {/* Institution Selector */}
              <div className="mb-6">
                <label className="text-xs font-bold uppercase text-slate-500 block mb-2">Select Institution</label>
                <select
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                >
                  <option value="">Select an institution...</option>
                  {institutions.map(inst => (
                    <option key={inst._id} value={inst._id}>{inst.name}</option>
                  ))}
                </select>
              </div>

              {institutionDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-500">Institution Name</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-semibold text-slate-900">
                        {institutionDetails.name || "Not provided"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-500">City</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700">
                        {institutionDetails.city || "Not provided"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-500">Street Address</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700">
                        {institutionDetails.line1 || "Not provided"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-500">Postal Code</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700">
                        {institutionDetails.postcode || "Not provided"}
                      </div>
                    </div>
                  </div>
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-cyan-900 mb-1">Location Summary</p>
                    <p className="text-sm text-cyan-800">
                      {[institutionDetails.line1, institutionDetails.line2, institutionDetails.city, institutionDetails.postcode]
                        .filter(Boolean).join(", ") || "No address information available"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Select an institution to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-cyan-500 selection:text-white">
      {!loginResult?.success ? (
        // Login Screen
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-100 via-slate-50 to-cyan-50">
          <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-12">
            {/* Left Side: Branding */}
            <div className="w-full lg:w-1/2 space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">ABMS Portal</h1>
                    <span className="text-xs text-slate-500 font-mono">Academic Business Management</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-slate-900">
                  Unified School Management
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Access your institution's portal with secure role-based authentication.
                  Manage students, instructors, parents, and system configuration from one place.
                </p>
              </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 max-w-xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

                  <div className="text-center md:text-left mb-6">
                    <h3 className="text-2xl font-bold text-slate-950">Portal Authentication</h3>
                    <p className="text-xs text-slate-500 mt-1">Select your role and enter credentials</p>
                  </div>

                  {/* Role Switcher */}
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
                          }}
                          className={`relative p-3 rounded-xl flex flex-col items-center justify-center gap-2 border text-center transition-all ${
                            isSelected
                              ? "bg-slate-50 border-slate-300/80 shadow-inner"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-500"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            isSelected ? `bg-gradient-to-br ${conf.colorClass} text-white shadow-md` : "bg-slate-100 text-slate-600"
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`text-[11px] font-bold ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                          {isSelected && (
                            <motion.div layoutId="activeRoleDot" className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-t-full bg-gradient-to-r ${conf.colorClass}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Error Banner */}
                  {loginResult && !loginResult.success && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2.5 items-start text-xs text-red-800">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Authentication Failed</p>
                        <p className="text-[11px] text-slate-600">{loginResult.message}</p>
                      </div>
                    </motion.div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{activeConfig.title} ID</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 transition-all focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-500">
                        <User className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
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
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Password</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 transition-all focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-500">
                        <Lock className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={isLoading}
                          className="w-full bg-transparent border-none outline-none text-slate-800 text-sm placeholder-slate-400 focus:ring-0"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || !username || !password}
                      className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                          Authenticating...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          Sign In
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </button>
                  </form>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : (
        // Dashboard Screen
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0 border-r border-slate-800 shrink-0">
            <div className="p-5 border-b border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shrink-0">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white truncate">ABMS Portal</h2>
                <span className="text-[9px] text-cyan-400 uppercase">Management</span>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-3 block mb-2">Navigation</span>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSearchQuery(""); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                      isActive
                        ? "bg-cyan-500/10 border-l-4 border-cyan-500 text-cyan-400"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800">
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-xl text-xs font-bold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-slate-50">
            {/* Top Header */}
            <header className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h1 className="text-lg font-bold text-slate-900 capitalize">{activeTab.replace(/-/g, ' ')}</h1>
                <p className="text-xs text-slate-500">
                  {selectedRole === "administrator" ? "Admin Dashboard" : `${selectedRole} Portal`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div
                  className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {loginResult?.data?.user?.first_name?.charAt(0) || loginResult?.data?.user?.name?.charAt(0) || "U"}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{loginResult?.data?.user?.first_name || loginResult?.data?.user?.name || "User"}</p>
                    <p className="text-xs text-slate-500 capitalize">{selectedRole}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </header>

            {/* Content Area */}
            <div className="p-6">
              {renderContent()}
            </div>
          </main>
        </div>
      )}

      {/* Modals */}
      {/* Add User Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-blue-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-lg font-bold text-slate-900">Add New User</h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {crudError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">{crudError}</div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">First Name *</label>
                    <input type="text" value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Last Name *</label>
                    <input type="text" value={formLastName} onChange={(e) => setFormLastName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Role</label>
                  <select value={formRole} onChange={(e) => setFormRole(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="parents">Parent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Email</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Phone</label>
                  <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">NIC</label>
                  <input type="text" value={formNic} onChange={(e) => setFormNic(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                </div>
                {formRole === "student" && (
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Registration Number</label>
                    <input type="text" value={formRegNo} onChange={(e) => setFormRegNo(e.target.value)} placeholder="Auto-generated if empty" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Sex</label>
                    <select value={formSex} onChange={(e) => setFormSex(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Date of Birth</label>
                    <input type="date" value={formDob} onChange={(e) => setFormDob(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Institution</label>
                  <select value={selectedInstitution} onChange={(e) => setSelectedInstitution(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                    <option value="">Select Institution</option>
                    {institutions.map(inst => (
                      <option key={inst._id} value={inst._id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-bold transition-colors">Cancel</button>
                <button onClick={handleAddUser} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-50">
                  {isSubmitting ? "Adding..." : "Add User"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedUserToEdit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Pencil className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-bold text-slate-900">Edit User</h3>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {crudError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">{crudError}</div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">First Name *</label>
                    <input type="text" value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Last Name *</label>
                    <input type="text" value={formLastName} onChange={(e) => setFormLastName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Email</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Phone</label>
                  <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">NIC</label>
                  <input type="text" value={formNic} onChange={(e) => setFormNic(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-bold transition-colors">Cancel</button>
                <button onClick={handleEditUser} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configure Mapping Modal */}
      <AnimatePresence>
        {isMappingModalOpen && selectedUserForMapping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Configure {selectedUserForMapping.name}
                  </h3>
                </div>
                <button onClick={() => setIsMappingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  {mappingType === "student" && "Assign this student to a grade and section."}
                  {mappingType === "teacher" && "Assign this instructor to a grade, section, and subject."}
                  {mappingType === "parent" && "Link students to this parent."}
                </p>

                {(mappingType === "student" || mappingType === "teacher") && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Grade</label>
                      <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                        <option value="">Select Grade</option>
                        {grades.map(g => (
                          <option key={g._id} value={g._id}>{g.grade}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Section</label>
                      <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                        <option value="">Select Section</option>
                        {sections.filter(s => !selectedGrade || s.grade === selectedGrade).map(s => (
                          <option key={s._id} value={s._id}>{s.__section || s._id}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                <button onClick={() => setIsMappingModalOpen(false)} className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-bold transition-colors">Cancel</button>
                <button onClick={handleSaveStudentMapping} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold shadow-lg">
                  <Save className="w-4 h-4" />
                  Save Mapping
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
