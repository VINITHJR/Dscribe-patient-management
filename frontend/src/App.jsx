import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  BedDouble,
  BadgeCheck,
  ClipboardList,
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  HeartPulse,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import "./App.css";

const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const DEFAULT_OPTIONS = {
  genders: ["Male", "Female", "Other"],
  wards: [
    "Emergency Ward",
    "General Ward",
    "ICU",
    "Maternity Ward",
    "Pediatric Ward",
    "Surgical Ward",
  ],
  departments: [
    "Cardiology",
    "Dermatology",
    "Emergency Medicine",
    "General Medicine",
    "Gynecology",
    "Neurology",
    "Oncology",
    "Orthopedics",
    "Pediatrics",
    "Urology",
  ],
  doctors: [
    "Dr. Amit Kumar",
    "Dr. Neha Rao",
    "Dr. Priya Sharma",
    "Dr. Ravi",
    "Dr. Suresh Reddy",
  ],
};

const STATUS_OPTIONS = ["Admitted", "Discharged"];

function getTodayDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function createEmptyForm() {
  return {
    name: "",
    age: "",
    gender: "Male",
    ward: "",
    department: "",
    doctor: "",
    admission_date: getTodayDate(),
    status: "Admitted",
  };
}

function normaliseStatus(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return "—";
  const datePart = String(value).slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(date.getTime())) return datePart;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function uniqueSorted(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => String(item?.msg || "Invalid input").replace(/^Value error,\s*/i, ""))
      .join("; ");
  }
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === "ERR_NETWORK") {
    return "Cannot connect to the patient API. Check that the FastAPI backend is running.";
  }
  return fallback;
}

function App() {
  const [patients, setPatients] = useState([]);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dischargingId, setDischargingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    ward: "All",
    department: "All",
    doctor: "All",
    status: "All",
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm);

  async function loadPatients({ quiet = false } = {}) {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await axios.get(`${API}/patients/`, { timeout: 15000 });
      const rows = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.patients)
          ? response.data.patients
          : null;

      if (!rows) {
        throw new Error("The API response was not a patient list.");
      }

      setPatients(rows);
      setError("");
    } catch (err) {
      setError(
        err.message === "The API response was not a patient list."
          ? err.message
          : getErrorMessage(err, "Unable to load patient records.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadOptions() {
    try {
      const response = await axios.get(`${API}/patients/options`, { timeout: 10000 });
      setOptions({
        genders: uniqueSorted([...(response.data?.genders || []), ...DEFAULT_OPTIONS.genders]),
        wards: uniqueSorted([...(response.data?.wards || []), ...DEFAULT_OPTIONS.wards]),
        departments: uniqueSorted([
          ...(response.data?.departments || []),
          ...DEFAULT_OPTIONS.departments,
        ]),
        doctors: uniqueSorted([...(response.data?.doctors || []), ...DEFAULT_OPTIONS.doctors]),
      });
    } catch {
      // Built-in choices remain available if the options endpoint is temporarily unavailable.
    }
  }

  useEffect(() => {
    void loadPatients();
    void loadOptions();
    // Initial data load only; explicit refresh and CRUD operations reload the records.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formOptions = useMemo(() => ({
    genders: uniqueSorted([...options.genders, ...patients.map((patient) => patient.gender), form.gender]),
    wards: uniqueSorted([...options.wards, ...patients.map((patient) => patient.ward), form.ward]),
    departments: uniqueSorted([
      ...options.departments,
      ...patients.map((patient) => patient.department),
      form.department,
    ]),
    doctors: uniqueSorted([...options.doctors, ...patients.map((patient) => patient.doctor), form.doctor]),
  }), [options, patients, form.gender, form.ward, form.department, form.doctor]);

  const filterOptions = useMemo(() => ({
    wards: uniqueSorted([...options.wards, ...patients.map((patient) => patient.ward)]),
    departments: uniqueSorted([
      ...options.departments,
      ...patients.map((patient) => patient.department),
    ]),
    doctors: uniqueSorted([...options.doctors, ...patients.map((patient) => patient.doctor)]),
  }), [options, patients]);

  const admittedCount = patients.filter(
    (patient) => normaliseStatus(patient.status) === "admitted"
  ).length;
  const dischargedCount = patients.filter(
    (patient) => normaliseStatus(patient.status) === "discharged"
  ).length;

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return patients.filter((patient) => {
      if (activePage === "Admissions" && normaliseStatus(patient.status) !== "admitted") {
        return false;
      }

      if (query && !String(patient.name ?? "").toLowerCase().includes(query)) {
        return false;
      }

      if (filters.ward !== "All" && patient.ward !== filters.ward) return false;
      if (filters.department !== "All" && patient.department !== filters.department) {
        return false;
      }
      if (filters.doctor !== "All" && patient.doctor !== filters.doctor) return false;
      if (
        activePage !== "Admissions" &&
        filters.status !== "All" &&
        normaliseStatus(patient.status) !== filters.status.toLowerCase()
      ) {
        return false;
      }

      return true;
    });
  }, [patients, search, filters, activePage]);

  function navigateTo(page) {
    setActivePage(page);
    setSearch("");
    setFilters({ ward: "All", department: "All", doctor: "All", status: "All" });
  }

  function updateFilter(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
  }

  function resetFilters() {
    setSearch("");
    setFilters({ ward: "All", department: "All", doctor: "All", status: "All" });
  }

  function openAddForm() {
    setEditingId(null);
    setForm(createEmptyForm());
    setError("");
    setShowForm(true);
  }

  function openEditForm(patient) {
    setEditingId(patient.id);
    setForm({
      name: patient.name ?? "",
      age: patient.age ?? "",
      gender: patient.gender ?? "Male",
      department: patient.department ?? "",
      ward: patient.ward ?? "",
      doctor: patient.doctor ?? "",
      admission_date: patient.admission_date
        ? String(patient.admission_date).slice(0, 10)
        : getTodayDate(),
      status: patient.status ?? "Admitted",
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setForm(createEmptyForm());
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function validateForm() {
    const name = form.name.trim();
    if (!name) return "Patient name is required.";
    if (!/^[A-Za-z ]+$/.test(name)) {
      return "Patient name must contain letters and spaces only.";
    }
    if (name.replace(/\s/g, "").length < 2) {
      return "Patient name must contain at least two letters.";
    }

    if (form.age === "") return "Age is required.";
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      return "Age must be a whole number between 0 and 120.";
    }

    if (!form.gender || !formOptions.genders.includes(form.gender)) {
      return "Please select a valid gender from the list.";
    }
    if (!form.ward || !formOptions.wards.includes(form.ward)) {
      return "Please select a ward from the list.";
    }
    if (!form.department || !formOptions.departments.includes(form.department)) {
      return "Please select a department from the list.";
    }
    if (!form.doctor || !formOptions.doctors.includes(form.doctor)) {
      return "Please select a doctor from the list.";
    }
    if (!form.admission_date) return "Admission date is required.";
    if (form.admission_date > getTodayDate()) {
      return "Admission date cannot be in the future.";
    }
    if (!STATUS_OPTIONS.includes(form.status)) {
      return "Please select a valid patient status.";
    }

    return "";
  }

  async function savePatient(event) {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      age: Number(form.age),
      ward: form.ward.trim(),
      department: form.department.trim(),
      doctor: form.doctor.trim(),
    };

    try {
      setSaving(true);
      setError("");

      if (editingId !== null) {
        await axios.put(`${API}/patients/${editingId}`, payload, { timeout: 15000 });
      } else {
        await axios.post(`${API}/patients/`, payload, { timeout: 15000 });
      }

      setShowForm(false);
      setEditingId(null);
      setForm(createEmptyForm());
      await loadPatients({ quiet: true });
      await loadOptions();
    } catch (err) {
      setError(getErrorMessage(
        err,
        "Unable to save the patient. Check the entered information and try again."
      ));
    } finally {
      setSaving(false);
    }
  }

  async function markAsDischarged(patient) {
    const confirmed = window.confirm(
      `Mark ${patient.name} as Discharged?`
    );
    if (!confirmed) return;

    try {
      setDischargingId(patient.id);
      setError("");
      await axios.patch(`${API}/patients/${patient.id}/discharge`, {}, { timeout: 15000 });
      await loadPatients({ quiet: true });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to mark this patient as discharged."));
    } finally {
      setDischargingId(null);
    }
  }

  async function deletePatient(patient) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${patient.name || "this patient"}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(patient.id);
      setError("");
      await axios.delete(`${API}/patients/${patient.id}`, { timeout: 15000 });
      await loadPatients({ quiet: true });
      await loadOptions();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete this patient."));
    } finally {
      setDeletingId(null);
    }
  }

  const pageCopy = {
    Dashboard: {
      title: "Patient Dashboard",
      description: "Monitor and manage hospital admissions.",
      recordsTitle: "Patient Records",
      recordsDescription: "A complete view of registered patients.",
    },
    Patients: {
      title: "Patient Records",
      description: "View, search, and manage registered patients.",
      recordsTitle: "All Registered Patients",
      recordsDescription: "Manage patient details and admission status.",
    },
    Admissions: {
      title: "Current Admissions",
      description: "Monitor patients currently admitted to the hospital.",
      recordsTitle: "Currently Admitted Patients",
      recordsDescription: "Only patients with Admitted status are shown.",
    },
  }[activePage];

  const hasActiveFilters =
    search.trim() !== "" ||
    filters.ward !== "All" ||
    filters.department !== "All" ||
    filters.doctor !== "All" ||
    filters.status !== "All";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><HeartPulse size={25} /></div>
          <div>
            <h2>CarePoint</h2>
            <span>Patient Management</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <button
          type="button"
          className={`nav-item ${activePage === "Dashboard" ? "active" : ""}`}
          onClick={() => navigateTo("Dashboard")}
          aria-current={activePage === "Dashboard" ? "page" : undefined}
        >
          <Activity size={19} />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activePage === "Patients" ? "active" : ""}`}
          onClick={() => navigateTo("Patients")}
          aria-current={activePage === "Patients" ? "page" : undefined}
        >
          <Users size={19} />
          <span>Patients</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activePage === "Admissions" ? "active" : ""}`}
          onClick={() => navigateTo("Admissions")}
          aria-current={activePage === "Admissions" ? "page" : undefined}
        >
          <BedDouble size={19} />
          <span>Admissions</span>
        </button>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />
            <div>
              <strong>API configured</strong>
              <small>FastAPI · {API.replace(/^https?:\/\//, "")}</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace / {activePage}</span>
            <h1>{pageCopy.title}</h1>
            <p>{pageCopy.description}</p>
          </div>

          <button type="button" className="primary-button" onClick={openAddForm}>
            <Plus size={18} />
            Add Patient
          </button>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {activePage === "Dashboard" && (
          <section className="stats-grid" aria-label="Patient statistics">
            <StatCard
              icon={<Users size={22} />}
              label="Total Patients"
              value={patients.length}
              color="blue"
            />
            <StatCard
              icon={<Activity size={22} />}
              label="Currently Admitted"
              value={admittedCount}
              color="green"
            />
            <StatCard
              icon={<ClipboardList size={22} />}
              label="Discharged"
              value={dischargedCount}
              color="orange"
            />
            <StatCard
              icon={<BedDouble size={22} />}
              label="Available Records"
              value={patients.length}
              color="purple"
            />
          </section>
        )}

        <section className="records-card">
          <div className="records-heading">
            <div>
              <h2>{pageCopy.recordsTitle}</h2>
              <p>{pageCopy.recordsDescription}</p>
            </div>
            <button
              type="button"
              className="refresh-button"
              onClick={() => loadPatients({ quiet: true })}
              title="Refresh patients"
              aria-label="Refresh patient records"
              disabled={refreshing}
            >
              <RefreshCw size={17} className={refreshing ? "spin" : ""} />
            </button>
          </div>

          <div className="filter-toolbar">
            <div className="search-box">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search by patient name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search patients by name"
              />
            </div>

            <label className="filter-control">
              <span>Ward</span>
              <select
                value={filters.ward}
                onChange={(event) => updateFilter("ward", event.target.value)}
                aria-label="Filter by ward"
              >
                <option value="All">All wards</option>
                {filterOptions.wards.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>

            <label className="filter-control">
              <span>Department</span>
              <select
                value={filters.department}
                onChange={(event) => updateFilter("department", event.target.value)}
                aria-label="Filter by department"
              >
                <option value="All">All departments</option>
                {filterOptions.departments.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>

            <label className="filter-control">
              <span>Doctor</span>
              <select
                value={filters.doctor}
                onChange={(event) => updateFilter("doctor", event.target.value)}
                aria-label="Filter by doctor"
              >
                <option value="All">All doctors</option>
                {filterOptions.doctors.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>

            {activePage !== "Admissions" && (
              <label className="filter-control">
                <span>Status</span>
                <select
                  value={filters.status}
                  onChange={(event) => updateFilter("status", event.target.value)}
                  aria-label="Filter by admission status"
                >
                  <option value="All">All statuses</option>
                  {STATUS_OPTIONS.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
            )}

            {hasActiveFilters && (
              <button type="button" className="reset-filter-button" onClick={resetFilters}>
                <RotateCcw size={14} />
                Reset
              </button>
            )}
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Department</th>
                  <th>Ward</th>
                  <th>Doctor</th>
                  <th>Admission Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="empty-state">Loading patient records...</td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      {error ? "Patient records could not be loaded." : "No patient records match these filters."}
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const admitted = normaliseStatus(patient.status) === "admitted";
                    const patientName = patient.name || "Unnamed patient";
                    const rowBusy =
                      dischargingId === patient.id || deletingId === patient.id;

                    return (
                      <tr key={patient.id}>
                        <td>
                          <div className="patient-cell">
                            <div className="avatar">
                              {patientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong>{patientName}</strong>
                              <small>ID: {patient.id} · Age: {patient.age ?? "—"}</small>
                            </div>
                          </div>
                        </td>
                        <td>{patient.department || "—"}</td>
                        <td>{patient.ward || "—"}</td>
                        <td>{patient.doctor || "—"}</td>
                        <td>{formatDate(patient.admission_date)}</td>
                        <td>
                          <span className={`status-badge ${admitted ? "admitted" : "discharged"}`}>
                            {patient.status || "Unknown"}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="icon-button edit"
                              onClick={() => openEditForm(patient)}
                              title="Edit patient"
                              aria-label={`Edit ${patientName}`}
                              disabled={rowBusy}
                            >
                              <Pencil size={16} />
                            </button>

                            {admitted && (
                              <button
                                type="button"
                                className="discharge-button"
                                onClick={() => markAsDischarged(patient)}
                                title="Mark patient as discharged"
                                aria-label={`Mark ${patientName} as discharged`}
                                disabled={rowBusy}
                              >
                                <BadgeCheck size={15} />
                                <span>{dischargingId === patient.id ? "Updating..." : "Discharge"}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              className="icon-button delete"
                              onClick={() => deletePatient(patient)}
                              title="Delete patient"
                              aria-label={`Delete ${patientName}`}
                              disabled={rowBusy}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            Showing {filteredPatients.length} of {patients.length} patients
            {activePage === "Admissions" ? " · Admitted only" : ""}
          </div>
        </section>

        <footer className="page-footer">
          CarePoint Patient Management System · Connected to FastAPI
        </footer>
      </main>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <div
            className="patient-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-form-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="patient-form-title">
                  {editingId !== null ? "Edit Patient" : "New Patient Admission"}
                </h2>
                <p>Enter the patient's admission details.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeForm}
                aria-label="Close form"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={savePatient}>
              <div className="form-grid">
                <FormField label="Patient Name">
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Enter full name"
                    minLength="2"
                    maxLength="150"
                    pattern="[A-Za-z ]+"
                    title="Use letters and spaces only."
                    autoComplete="name"
                    required
                  />
                </FormField>

                <FormField label="Age">
                  <input
                    name="age"
                    type="number"
                    min="0"
                    max="120"
                    step="1"
                    value={form.age}
                    onChange={updateField}
                    placeholder="Enter age"
                    required
                  />
                </FormField>

                <FormField label="Gender">
                  <select name="gender" value={form.gender} onChange={updateField} required>
                    <option value="">Select gender</option>
                    {formOptions.genders.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Department">
                  <select
                    name="department"
                    value={form.department}
                    onChange={updateField}
                    required
                  >
                    <option value="">Select department</option>
                    {formOptions.departments.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Ward">
                  <select name="ward" value={form.ward} onChange={updateField} required>
                    <option value="">Select ward</option>
                    {formOptions.wards.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Doctor">
                  <select name="doctor" value={form.doctor} onChange={updateField} required>
                    <option value="">Select doctor</option>
                    {formOptions.doctors.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Admission Date">
                  <input
                    name="admission_date"
                    type="date"
                    min="1900-01-01"
                    max={getTodayDate()}
                    value={form.admission_date}
                    onChange={updateField}
                    required
                  />
                </FormField>

                <FormField label="Status">
                  <select name="status" value={form.status} onChange={updateField} required>
                    {STATUS_OPTIONS.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Register Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <p>{label}</p>
        <h2>{value}</h2>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default App;
