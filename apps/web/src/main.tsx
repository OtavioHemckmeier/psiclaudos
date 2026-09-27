import { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./styles.css";

const API = import.meta.env.VITE_API_URL ?? "/api";

const applyAccessibilityAttributes = () => {
  document
    .querySelector(".dashboard-main")
    ?.setAttribute("id", "conteudo-principal");
  document
    .querySelector(".filter-form select")
    ?.setAttribute("aria-label", "Filtrar avaliações por status");
};

new MutationObserver(applyAccessibilityAttributes).observe(
  document.documentElement,
  { childList: true, subtree: true },
);

type Patient = {
  id: string;
  name: string;
  createdAt?: string;
  document?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  education?: string | null;
  healthPlan?: string | null;
  responsible1Name?: string | null;
  responsible1Phone?: string | null;
  responsible2Name?: string | null;
  responsible2Phone?: string | null;
  address?: Record<string, string> | null;
  notes?: string | null;
};
type PatientForm = Omit<Patient, "id">;
type PatientPage = {
  items: Patient[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

const emptyPatientForm = (): PatientForm => ({
  name: "",
  document: "",
  birthDate: "",
  gender: "",
  email: "",
  phone: "",
  education: "",
  healthPlan: "",
  responsible1Name: "",
  responsible1Phone: "",
  responsible2Name: "",
  responsible2Phone: "",
  address: {
    cep: "",
    city: "",
    state: "",
    street: "",
    district: "",
    number: "",
    complement: "",
  },
  notes: "",
});

const patientAge = (birthDate?: string | null) => {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const birthdayThisYear = new Date(
    today.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  if (today < birthdayThisYear) age -= 1;
  return age >= 0 ? age : null;
};

const onlyDigits = (value: string, length: number) =>
  value.replace(/\D/g, "").slice(0, length);
const formatCpf = (value: string) =>
  onlyDigits(value, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const formatPhone = (value: string) =>
  onlyDigits(value, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
const formatCep = (value: string) =>
  onlyDigits(value, 8).replace(/(\d{5})(\d)/, "$1-$2");
type Evaluation = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  applications?: Array<{
    id: string;
    status: string;
    instrumentVersion?: { version: string; instrument: { name: string } };
  }>;
  requester?: string | null;
  purpose?: string | null;
  demandDescription?: string | null;
  anamnesis?: Record<string, string> | null;
  conclusion?: string | null;
  referral?: string | null;
  patient: Patient;
};
type Field = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: Array<{ value: string; label: string }>;
};
type Instrument = {
  id: string;
  name: string;
  versions: Array<{
    id: string;
    version: string;
    formSchema: {
      sections: Array<{ id: string; title: string; fields: Field[] }>;
    };
  }>;
};
type Application = {
  id: string;
  status: string;
  answers?: Record<string, unknown>;
  result?: Record<string, unknown>;
  professionalSummary?: string | null;
  instrumentVersion: Instrument["versions"][number] & {
    instrument: { name: string };
  };
};
type Report = { id: string; revision: number; generatedAt: string };
type Profile = {
  id: string;
  name: string;
  email: string;
  professionalRegistration?: string | null;
  document?: string | null;
  phone?: string | null;
  specialties?: string[] | null;
  professionalBio?: string | null;
  signatureText?: string | null;
  organization?: { name: string; email?: string | null; phone?: string | null };
};
type PatientDetails = Patient & {
  evaluations: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    applications: Array<{ id: string; status: string }>;
  }>;
};
type AuditEvent = {
  id: string;
  event: string;
  entityType: string;
  createdAt: string;
};

type WorkspaceView =
  | "dashboard"
  | "patients"
  | "patient"
  | "patientEdit"
  | "reports"
  | "editor"
  | "results"
  | "profile"
  | "settings";

const viewFromPathname = (pathname: string): WorkspaceView => {
  if (/^\/pacientes\/[^/]+\/editar$/.test(pathname)) return "patientEdit";
  if (/^\/pacientes\/[^/]+$/.test(pathname)) return "patient";
  switch (pathname) {
    case "/pacientes":
      return "patients";
    case "/laudos":
      return "reports";
    case "/resultados":
      return "results";
    case "/editor":
      return "editor";
    case "/perfil":
      return "profile";
    case "/configuracoes":
      return "settings";
    default:
      return "dashboard";
  }
};

const viewDetails: Record<WorkspaceView, { title: string; subtitle: string }> =
  {
    dashboard: {
      title: "Visão geral",
      subtitle: "Acompanhe pacientes, laudos e resultados.",
    },
    patients: {
      title: "Pacientes",
      subtitle: "Cadastre e acompanhe os pacientes da organização.",
    },
    patient: {
      title: "Paciente",
      subtitle: "Consulte o cadastro e acompanhe o histórico do paciente.",
    },
    patientEdit: {
      title: "Editar paciente",
      subtitle: "Atualize os dados cadastrais do paciente.",
    },
    reports: {
      title: "Laudos",
      subtitle: "Crie e acompanhe as avaliações em andamento.",
    },
    editor: {
      title: "Editor de laudo",
      subtitle: "Organize os capítulos e prepare o documento para revisão.",
    },
    results: {
      title: "Resultados",
      subtitle: "Preencha, revise e bloqueie a aplicação atual.",
    },
    profile: {
      title: "Perfil profissional",
      subtitle: "Mantenha seus dados profissionais atualizados.",
    },
    settings: {
      title: "Configurações",
      subtitle: "Gerencie as opções disponíveis para a organização.",
    },
  };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const accessToken = localStorage.getItem("laudo_token");
  const makeRequest = (token: string | null) =>
    fetch(`${API}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  let response = await makeRequest(accessToken);
  if (response.status === 401 && path !== "/auth/refresh") {
    {
      const refreshResponse = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (refreshResponse.ok) {
        const session = (await refreshResponse.json()) as {
          accessToken: string;
          refreshToken: string;
        };
        localStorage.setItem("laudo_token", session.accessToken);
        response = await makeRequest(session.accessToken);
      }
    }
    if (response.status === 401) {
      localStorage.removeItem("laudo_token");
      localStorage.removeItem("laudo_refresh_token");
      window.dispatchEvent(new Event("laudo-session-expired"));
    }
  }
  if (!response.ok)
    throw new Error(
      (await response.json().catch(() => null))?.message ??
        "Não foi possível concluir a operação.",
    );
  return response.json();
}

function InstrumentFieldControl({
  field,
  value,
  disabled,
  onChange,
}: {
  field: Field;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "TEXTAREA") {
    return (
      <textarea
        disabled={disabled}
        rows={5}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    );
  }
  if (field.type === "BOOLEAN") {
    return (
      <label className="boolean-field">
        <input
          disabled={disabled}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />{" "}
        Sim
      </label>
    );
  }
  if (field.type === "MULTIPLE_CHOICE") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <fieldset className="choice-list">
        {field.options?.map((option) => (
          <label key={option.value}>
            <input
              disabled={disabled}
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value),
                )
              }
            />{" "}
            {option.label}
          </label>
        ))}
      </fieldset>
    );
  }
  if (
    field.type === "SINGLE_CHOICE" ||
    (field.type === "SCALE" && field.options?.length)
  ) {
    return (
      <select
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      >
        <option value="">Selecione</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  const inputType =
    field.type === "NUMBER" || field.type === "SCALE"
      ? "number"
      : field.type === "DATE"
        ? "date"
        : "text";
  return (
    <input
      disabled={disabled}
      type={inputType}
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      required={field.required}
    />
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(
    "login",
  );
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      if (mode === "forgot") {
        const result = await request<{
          message: string;
          developmentToken?: string;
        }>("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setNotice(
          result.developmentToken
            ? `Token local gerado: ${result.developmentToken}`
            : result.message,
        );
        if (result.developmentToken) setResetToken(result.developmentToken);
        return;
      }
      if (mode === "reset") {
        const result = await request<{ message: string }>(
          "/auth/reset-password",
          {
            method: "POST",
            body: JSON.stringify({ token: resetToken, password }),
          },
        );
        setNotice(result.message);
        setMode("login");
        return;
      }
      const registering = mode === "register";
      const result = await request<{
        accessToken: string;
        refreshToken: string;
      }>(registering ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(
          registering
            ? { organizationName, name, email, password }
            : { email, password },
        ),
      });
      localStorage.setItem("laudo_token", result.accessToken);
      localStorage.setItem("laudo_refresh_token", result.refreshToken);
      onLogin();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível concluir.",
      );
    }
  }
  const registering = mode === "register";
  const forgot = mode === "forgot";
  const reset = mode === "reset";
  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <section className="auth-intro">
          <div className="brand-lockup">
            <span className="brand-mark">L</span>
            <div>
              <strong>Laudo</strong>
              <small>Correção psicológica</small>
            </div>
          </div>
          <span className="auth-kicker">Workspace clínico</span>
          <h1>Resultados claros para decisões profissionais.</h1>
          <p>
            Organize pacientes, avaliações e sínteses revisadas em um ambiente
            seguro e simples.
          </p>
          <div className="auth-points">
            <span>✓ Correção estruturada</span>
            <span>✓ Histórico auditável</span>
            <span>✓ PDF revisado pelo psicólogo</span>
          </div>
        </section>
        <section className="auth-card">
          <p className="eyebrow">
            {registering
              ? "Primeiro acesso"
              : forgot || reset
                ? "Recuperação de acesso"
                : "Área do psicólogo"}
          </p>
          <h2>
            {registering
              ? "Criar sua conta"
              : forgot
                ? "Recuperar senha"
                : reset
                  ? "Definir nova senha"
                  : "Entrar na plataforma"}
          </h2>
          <p className="muted">
            {forgot
              ? "Informe seu e-mail para receber as instruções."
              : reset
                ? "Use o token recebido e escolha uma nova senha."
                : registering
                  ? "Crie a organização e comece o primeiro fluxo."
                  : "Acesse seus pacientes e avaliações."}
          </p>
          <form onSubmit={submit}>
            {registering && (
              <>
                <label>
                  Nome da organização
                  <input
                    value={organizationName}
                    onChange={(event) =>
                      setOrganizationName(event.target.value)
                    }
                    required
                  />
                </label>
                <label>
                  Seu nome
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>
              </>
            )}
            {reset && (
              <label>
                Token de recuperação
                <input
                  value={resetToken}
                  onChange={(event) => setResetToken(event.target.value)}
                  required
                />
              </label>
            )}
            {!reset && (
              <label>
                E-mail
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
            )}
            {!forgot && (
              <label>
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
            )}
            {error && <p className="error">{error}</p>}
            {notice && <p className="notice auth-notice">{notice}</p>}
            <button type="submit">
              {registering
                ? "Criar conta"
                : forgot
                  ? "Gerar instruções"
                  : reset
                    ? "Redefinir senha"
                    : "Entrar"}
            </button>
          </form>
          {mode === "login" && (
            <>
              <button
                className="link-button"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                }}
              >
                Esqueci minha senha
              </button>
              <button
                className="link-button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Criar uma conta
              </button>
            </>
          )}
          {mode === "forgot" && (
            <>
              <button className="link-button" onClick={() => setMode("reset")}>
                Já tenho um token
              </button>
              <button className="link-button" onClick={() => setMode("login")}>
                Voltar para entrar
              </button>
            </>
          )}
          {(mode === "register" || mode === "reset") && (
            <button className="link-button" onClick={() => setMode("login")}>
              Voltar para entrar
            </button>
          )}
        </section>
      </div>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const view = viewFromPathname(location.pathname);
  const patientRouteId =
    view === "patient" || view === "patientEdit"
      ? location.pathname.split("/")[2]
      : null;
  const isPatientEditPage = view === "patientEdit";
  const [patients, setPatients] = useState<Patient[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patientFormOpen, setPatientFormOpen] = useState(false);
  const [patientForm, setPatientForm] = useState<PatientForm>(emptyPatientForm);
  const [patientFormError, setPatientFormError] = useState("");
  const [savingPatient, setSavingPatient] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [patientDetailsTab, setPatientDetailsTab] = useState<
    "data" | "address" | "reports" | "notes"
  >("data");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const [patientPagination, setPatientPagination] = useState<PatientPage>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    pages: 1,
  });
  const [title, setTitle] = useState("");
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [evaluationStatus, setEvaluationStatus] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] =
    useState<Evaluation | null>(null);
  const [reportChapter, setReportChapter] = useState<
    "identification" | "demand" | "anamnesis" | "conclusion" | "referral"
  >("identification");
  const [reportContent, setReportContent] = useState({
    requester: "",
    purpose: "",
    demandDescription: "",
    anamnesis: {
      personalHistory: "",
      familyContext: "",
      medicalHistory: "",
      psychosocialFactors: "",
    },
    conclusion: "",
    referral: "",
  });
  const [application, setApplication] = useState<Application | null>(null);
  const [applicationTab, setApplicationTab] = useState<
    "test" | "results" | "details"
  >("test");
  const [instrumentPickerOpen, setInstrumentPickerOpen] = useState(false);
  const [instrumentVersionId, setInstrumentVersionId] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [details, setDetails] = useState<PatientDetails | null>(null);
  const [patientDetailLoading, setPatientDetailLoading] = useState(false);
  const [patientDetailError, setPatientDetailError] = useState("");
  const [patientAudit, setPatientAudit] = useState<AuditEvent[]>([]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activity, setActivity] = useState<AuditEvent[]>([]);
  async function load(
    filters = {
      patient: patientSearch,
      evaluation: evaluationSearch,
      status: evaluationStatus,
    },
    page = patientPage,
  ) {
    setLoading(true);
    try {
      const patientParams = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(filters.patient ? { search: filters.patient } : {}),
      });
      const [patientData, evaluationData, instrumentData, profileData] =
        await Promise.all([
          request<PatientPage>(`/patients?${patientParams}`),
          request<Evaluation[]>(
            `/evaluations?${new URLSearchParams({ ...(filters.evaluation ? { search: filters.evaluation } : {}), ...(filters.status ? { status: filters.status } : {}) })}`,
          ),
          request<Instrument[]>("/instruments"),
          request<Profile>("/auth/me"),
        ]);
      setPatients(patientData.items);
      setPatientPagination(patientData);
      setEvaluations(evaluationData);
      setInstruments(instrumentData);
      setProfile(profileData);
      if (!patientId && patientData.items[0])
        setPatientId(patientData.items[0].id);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Falha ao carregar dados.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!patientRouteId) {
      setDetails(null);
      return;
    }
    let active = true;
    setDetails(null);
    setPatientDetailLoading(true);
    setPatientDetailError("");
    setPatientDetailsTab("data");
    Promise.all([
      request<PatientDetails>(`/patients/${patientRouteId}/details`),
      request<AuditEvent[]>(`/audit?entityType=Patient&entityId=${patientRouteId}`),
    ])
      .then(([patient, auditEvents]) => {
        if (!active) return;
        setDetails(patient);
        setPatientAudit(auditEvents);
        setNotesDraft(patient.notes ?? "");
        setEditingNotes(false);
        if (view === "patientEdit") {
          setEditingPatientId(patient.id);
          setPatientForm({
            ...emptyPatientForm(),
            ...patient,
            birthDate: patient.birthDate?.slice(0, 10) ?? "",
            address: { ...emptyPatientForm().address, ...patient.address },
          });
          setPatientFormOpen(true);
        }
      })
      .catch((error) => {
        if (active)
          setPatientDetailError(
            error instanceof Error ? error.message : "Não foi possível abrir o paciente.",
          );
      })
      .finally(() => {
        if (active) setPatientDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientRouteId, view]);
  async function createFullPatient(event: FormEvent) {
    event.preventDefault();
    setPatientFormError("");
    setSavingPatient(true);
    try {
      const savedPatient = await request<Patient>(
        editingPatientId ? `/patients/${editingPatientId}` : "/patients",
        {
          method: editingPatientId ? "PATCH" : "POST",
          body: JSON.stringify(patientForm),
        },
      );
      const wasEditing = Boolean(editingPatientId);
      setPatientForm(emptyPatientForm());
      setPatientFormOpen(false);
      setEditingPatientId(null);
      if (wasEditing)
        setDetails(
          await request<PatientDetails>(`/patients/${savedPatient.id}/details`),
        );
      setMessage(
        wasEditing
          ? "Paciente atualizado com sucesso."
          : "Paciente cadastrado com sucesso.",
      );
      await load();
      if (wasEditing && isPatientEditPage)
        routerNavigate(`/pacientes/${savedPatient.id}`);
    } catch (err) {
      setPatientFormError(
        err instanceof Error
          ? err.message
          : "Não foi possível cadastrar o paciente.",
      );
    } finally {
      setSavingPatient(false);
    }
  }
  const updatePatientAddress = (field: string, value: string) => {
    setPatientForm({
      ...patientForm,
      address: { ...patientForm.address, [field]: value },
    });
  };
  const openPatientForm = (patient?: Patient) => {
    setPatientFormError("");
    setEditingPatientId(patient?.id ?? null);
    setPatientForm(
      patient
        ? {
            ...emptyPatientForm(),
            ...patient,
            birthDate: patient.birthDate?.slice(0, 10) ?? "",
            address: { ...emptyPatientForm().address, ...patient.address },
          }
        : emptyPatientForm(),
    );
    if (patient) {
      routerNavigate(`/pacientes/${patient.id}/editar`);
      window.scrollTo(0, 0);
    }
    setPatientFormOpen(true);
  };
  async function createEvaluation(event: FormEvent) {
    event.preventDefault();
    if (!patientId) return;
    try {
      await request("/evaluations", {
        method: "POST",
        body: JSON.stringify({ patientId, title }),
      });
      setTitle("");
      setReportFormOpen(false);
      setMessage("Avaliação criada.");
      await load();
      if (patientRouteId)
        setDetails(await request<PatientDetails>(`/patients/${patientRouteId}/details`));
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível criar a avaliação.",
      );
    }
  }
  async function searchPatients(event: FormEvent) {
    event.preventDefault();
    setPatientPage(1);
    await load(
      {
        patient: patientSearch,
        evaluation: evaluationSearch,
        status: evaluationStatus,
      },
      1,
    );
  }
  async function goToPatientPage(page: number) {
    setPatientPage(page);
    await load(undefined, page);
  }
  async function searchEvaluations(event: FormEvent) {
    event.preventDefault();
    await load({
      patient: patientSearch,
      evaluation: evaluationSearch,
      status: evaluationStatus,
    });
  }
  function openDetails(id: string) {
    routerNavigate(`/pacientes/${id}`);
    window.scrollTo(0, 0);
  }
  async function savePatientNotes() {
    if (!details) return;
    try {
      const updated = await request<PatientDetails>(
        `/patients/${details.id}/notes`,
        { method: "PATCH", body: JSON.stringify({ notes: notesDraft }) },
      );
      setDetails({ ...details, ...updated, evaluations: details.evaluations });
      setPatientAudit(
        await request<AuditEvent[]>(
          `/audit?entityType=Patient&entityId=${details.id}`,
        ),
      );
      setEditingNotes(false);
      setMessage("Anotações salvas.");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as anotações.",
      );
    }
  }
  async function archivePatient(id: string) {
    if (
      !window.confirm(
        "Deseja arquivar este paciente? O histórico será preservado e o cadastro deixará de aparecer nas listas.",
      )
    )
      return;
    try {
      await request(`/patients/${id}`, { method: "DELETE" });
      setDetails(null);
      setMessage("Paciente arquivado.");
      await load();
      routerNavigate("/pacientes");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível arquivar o paciente.",
      );
    }
  }
  const createReportForPatient = (patient: Patient) => {
    setPatientId(patient.id);
    setTitle("");
    setReportFormOpen(true);
  };
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    try {
      const updated = await request<Profile>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: profile.name,
          professionalRegistration: profile.professionalRegistration ?? "",
          document: profile.document ?? "",
          phone: profile.phone ?? "",
          specialties: profile.specialties ?? [],
          professionalBio: profile.professionalBio ?? "",
          signatureText: profile.signatureText ?? "",
          organizationName: profile.organization?.name ?? "",
          organizationEmail: profile.organization?.email ?? "",
          organizationPhone: profile.organization?.phone ?? "",
        }),
      });
      setProfile(updated);
      setProfileOpen(false);
      setMessage("Perfil atualizado.");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o perfil.",
      );
    }
  }
  async function exportMyData() {
    try {
      const data = await request<object>("/auth/me/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "meus-dados-laudo.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Arquivo de dados pessoais preparado para download.");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível exportar seus dados.",
      );
    }
  }
  async function requestClosure() {
    if (
      !window.confirm(
        "Deseja solicitar o encerramento da sua conta? Você será desconectado.",
      )
    )
      return;
    try {
      const result = await request<{ message: string }>(
        "/auth/me/closure-request",
        { method: "POST" },
      );
      setMessage(result.message);
      logout();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível solicitar o encerramento.",
      );
    }
  }
  async function openActivity() {
    try {
      setActivity(await request<AuditEvent[]>("/audit"));
      setActivityOpen(true);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar a atividade.",
      );
    }
  }
  async function loadReports(id: string) {
    setReports(await request<Report[]>(`/reports/evaluations/${id}`));
  }
  async function startApplication(
    evaluation: Evaluation,
    selectedInstrumentVersionId: string,
  ) {
    if (!selectedInstrumentVersionId) {
      setMessage("Nenhum instrumento publicado no catálogo.");
      return;
    }
    const created = await request<Application>(
      `/evaluations/${evaluation.id}/applications`,
      {
        method: "POST",
        body: JSON.stringify({
          instrumentVersionId: selectedInstrumentVersionId,
        }),
      },
    );
    const instrument = instruments.find((item) =>
      item.versions.some(
        (version) => version.id === selectedInstrumentVersionId,
      ),
    );
    const version = instrument?.versions.find(
      (item) => item.id === selectedInstrumentVersionId,
    );
    if (!instrument || !version) return;
    setSelectedEvaluation(evaluation);
    setApplication({
      ...created,
      instrumentVersion: {
        ...version,
        instrument: { name: instrument.name },
      },
    });
    setAnswers(created.answers ?? {});
    setSummary(created.professionalSummary ?? "");
    setApplicationTab("test");
    await loadReports(evaluation.id);
    setInstrumentPickerOpen(false);
    setInstrumentVersionId("");
    routerNavigate("/resultados");
  }
  const openInstrumentPicker = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setInstrumentVersionId("");
    setInstrumentPickerOpen(true);
  };
  async function openApplication(applicationId: string) {
    try {
      const loaded = await request<Application>(
        `/evaluations/applications/${applicationId}`,
      );
      setApplication(loaded);
      setAnswers(loaded.answers ?? {});
      setSummary(loaded.professionalSummary ?? "");
      setApplicationTab("test");
      routerNavigate("/resultados");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível abrir a aplicação.",
      );
    }
  }
  async function openReport(id: string) {
    try {
      const evaluation = await request<Evaluation>(`/evaluations/${id}`);
      setSelectedEvaluation(evaluation);
      setReportChapter("identification");
      setReportContent({
        requester: evaluation.requester ?? "",
        purpose: evaluation.purpose ?? "",
        demandDescription: evaluation.demandDescription ?? "",
        anamnesis: {
          personalHistory: "",
          familyContext: "",
          medicalHistory: "",
          psychosocialFactors: "",
          ...evaluation.anamnesis,
        },
        conclusion: evaluation.conclusion ?? "",
        referral: evaluation.referral ?? "",
      });
      await loadReports(id);
      routerNavigate("/editor");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Não foi possível abrir o laudo.",
      );
    }
  }
  async function saveReportChapter() {
    if (!selectedEvaluation) return;
    try {
      const fields =
        reportChapter === "identification"
          ? {
              requester: reportContent.requester,
              purpose: reportContent.purpose,
            }
          : reportChapter === "demand"
            ? { demandDescription: reportContent.demandDescription }
            : reportChapter === "anamnesis"
              ? { anamnesis: reportContent.anamnesis }
              : reportChapter === "conclusion"
                ? { conclusion: reportContent.conclusion }
                : { referral: reportContent.referral };
      const updated = await request<Evaluation>(
        `/evaluations/${selectedEvaluation.id}`,
        { method: "PATCH", body: JSON.stringify(fields) },
      );
      setSelectedEvaluation({
        ...selectedEvaluation,
        ...updated,
        patient: selectedEvaluation.patient,
      });
      setMessage("Capítulo salvo com sucesso.");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o capítulo.",
      );
    }
  }
  async function saveAnswers() {
    if (!application) return;
    await request(`/evaluations/applications/${application.id}/answers`, {
      method: "PATCH",
      body: JSON.stringify({ answers }),
    });
    setMessage("Respostas salvas.");
  }
  const requiredFieldsMissing = () =>
    application?.instrumentVersion.formSchema.sections
      .flatMap((section) => section.fields)
      .filter((field) => {
        if (!field.required) return false;
        const value = answers[field.id];
        return (
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        );
      }) ?? [];
  async function calculate() {
    if (!application) return;
    const missing = requiredFieldsMissing();
    if (missing.length > 0) {
      setMessage(
        `Preencha os campos obrigatórios: ${missing.map((field) => field.label).join(", ")}.`,
      );
      return;
    }
    await saveAnswers();
    setApplication(
      await request<Application>(
        `/evaluations/applications/${application.id}/calculate`,
        { method: "POST" },
      ),
    );
    setMessage("Resultado calculado.");
  }
  async function review() {
    if (!application) return;
    await request(`/evaluations/applications/${application.id}/summary`, {
      method: "PATCH",
      body: JSON.stringify({ summary }),
    });
    setApplication(
      await request<Application>(
        `/evaluations/applications/${application.id}/review`,
        { method: "POST" },
      ),
    );
    setMessage("Resultado revisado.");
  }
  async function lock() {
    if (!application) return;
    setApplication(
      await request<Application>(
        `/evaluations/applications/${application.id}/lock`,
        { method: "POST" },
      ),
    );
    setMessage("Aplicação bloqueada.");
  }
  async function reopen() {
    if (!application) return;
    setApplication(
      await request<Application>(
        `/evaluations/applications/${application.id}/reopen`,
        { method: "POST" },
      ),
    );
    setMessage("Aplicação reaberta para edição.");
  }
  async function previewReport(id: string) {
    const response = await fetch(`${API}/reports/${id}/preview`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("laudo_token")}`,
      },
    });
    if (!response.ok) throw new Error("Não foi possível abrir o PDF.");
    const url = URL.createObjectURL(await response.blob());
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  async function generateReport() {
    if (!selectedEvaluation) return;
    const report = await request<{ id: string }>(
      `/reports/evaluations/${selectedEvaluation.id}`,
      { method: "POST" },
    );
    await loadReports(selectedEvaluation.id);
    await previewReport(report.id);
    setMessage("PDF gerado e aberto para visualização.");
  }
  const canEdit =
    application?.status === "IN_PROGRESS" || application?.status === "REOPENED";
  const logout = () => {
    localStorage.removeItem("laudo_token");
    localStorage.removeItem("laudo_refresh_token");
    onLogout();
  };
  const navigate = (nextView: WorkspaceView) => {
    const routes: Record<WorkspaceView, string> = {
      dashboard: "/",
      patients: "/pacientes",
      patient: "/pacientes",
      patientEdit: "/pacientes",
      reports: "/laudos",
      editor: "/editor",
      results: "/resultados",
      profile: "/perfil",
      settings: "/configuracoes",
    };
    setMobileMenu(false);
    routerNavigate(routes[nextView]);
  };
  return (
    <main className="dashboard-shell">
      <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">L</span>
          <div>
            <strong>Laudo</strong>
            <small>Correção psicológica</small>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setMobileMenu(false)}
          >
            ×
          </button>
        </div>
        <div className="sidebar-context">
          <span className="online-dot" />{" "}
          {profile?.organization?.name ?? "Organização ativa"}
          <small>Workspace clínico</small>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end onClick={() => setMobileMenu(false)}>
            ▦ <span>Visão geral</span>
          </NavLink>
          <NavLink to="/pacientes" onClick={() => setMobileMenu(false)}>
            ♙ <span>Pacientes</span>
          </NavLink>
          <NavLink
            to="/laudos"
            className={view === "editor" ? "active" : undefined}
            onClick={() => setMobileMenu(false)}
          >
            ▤ <span>Laudos</span>
          </NavLink>
          <NavLink to="/resultados" onClick={() => setMobileMenu(false)}>
            ◈ <span>Resultados</span>
          </NavLink>
          <NavLink to="/perfil" onClick={() => setMobileMenu(false)}>
            ◉ <span>Perfil</span>
          </NavLink>
          <NavLink to="/configuracoes" onClick={() => setMobileMenu(false)}>
            ⚙ <span>Configurações</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <span>Ambiente local</span>
          <button className="sidebar-logout" onClick={logout}>
            ↪ Sair
          </button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileMenu(true)}>
            ☰
          </button>
          <div>
            <p className="eyebrow">Workspace clínico</p>
            <h1>{viewDetails[view].title}</h1>
            <p className="header-subtitle">{viewDetails[view].subtitle}</p>
          </div>
          <div className="header-actions">
            <button
              className="profile-chip"
              onClick={() => setProfileOpen(true)}
            >
              <span className="avatar">
                {profile?.name.slice(0, 2).toUpperCase() ?? "PS"}
              </span>
              <span>
                <strong>{profile?.name ?? "Psicólogo"}</strong>
                <small>
                  {profile?.professionalRegistration || "Conta profissional"}
                </small>
              </span>
            </button>
            <button className="secondary topbar-logout" onClick={logout}>
              Sair
            </button>
          </div>
        </header>
        {message && (
          <div className="notice">
            {message}
            <button onClick={() => setMessage("")} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        )}
        {view === "dashboard" && (
          <section className="overview-stats">
            <article>
              <span className="stat-icon orange">♙</span>
              <div>
                <strong>{patients.length}</strong>
                <span>Pacientes ativos</span>
              </div>
            </article>
            <article>
              <span className="stat-icon blue">▤</span>
              <div>
                <strong>{evaluations.length}</strong>
                <span>Avaliações criadas</span>
              </div>
            </article>
            <article>
              <span className="stat-icon green">✓</span>
              <div>
                <strong>
                  {
                    evaluations.filter((item) => item.status === "COMPLETED")
                      .length
                  }
                </strong>
                <span>Concluídas</span>
              </div>
            </article>
          </section>
        )}
        {(view === "dashboard" ||
          view === "patients" ||
          view === "reports") && (
          <div
            className={`content-grid ${view === "dashboard" ? "" : "content-grid-single"}`}
          >
            {(view === "dashboard" || view === "patients") && (
              <section className="panel patients-panel" id="pacientes">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">Cadastro</span>
                    <h2>Pacientes</h2>
                    {view === "patients" && (
                      <p className="patients-heading-note">
                        Gerencie os cadastros e acesse o histórico de cada paciente.
                      </p>
                    )}
                  </div>
                  <div className="panel-actions">
                    <button
                      className="patients-new-button"
                      type="button"
                      onClick={() => openPatientForm()}
                    >
                      <span aria-hidden="true">＋</span> Novo paciente
                    </button>
                  </div>
                </div>
                <form onSubmit={searchPatients} className="patients-search-form">
                  <label htmlFor="patient-search">Buscar paciente</label>
                  <div className="patients-search-controls">
                    <input
                      id="patient-search"
                      placeholder="Digite o nome do paciente"
                      value={patientSearch}
                      onChange={(event) => setPatientSearch(event.target.value)}
                    />
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => {
                        setPatientSearch("");
                        setPatientPage(1);
                        void load({ patient: "", evaluation: evaluationSearch, status: evaluationStatus }, 1);
                      }}
                    >
                      Limpar
                    </button>
                    <button type="submit">Buscar</button>
                  </div>
                </form>
                {loading ? (
                  <p className="muted empty-state">Carregando pacientes...</p>
                ) : patients.length === 0 ? (
                  <p className="muted empty-state">
                    Nenhum paciente encontrado.
                  </p>
                ) : view === "patients" ? (
                  <>
                    <div className="table-wrap patients-table-wrap">
                      <table className="data-table patients-table">
                        <thead>
                          <tr>
                            <th>Criado</th>
                            <th>Nome</th>
                            <th>Telefone</th>
                            <th>Opções</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patients.map((patient) => (
                            <tr key={patient.id}>
                              <td>
                                {patient.createdAt
                                  ? new Date(
                                      patient.createdAt,
                                    ).toLocaleDateString("pt-BR")
                                  : "—"}
                              </td>
                              <td>{patient.name}</td>
                              <td>{patient.phone ?? "—"}</td>
                              <td>
                                <button
                                  className="patients-details-button"
                                  onClick={() => void openDetails(patient.id)}
                                >
                                  Detalhes
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {patientPagination.pages > 1 && (
                      <div className="table-pagination">
                        <button
                          className="secondary small"
                          disabled={patientPagination.page <= 1}
                          onClick={() =>
                            void goToPatientPage(patientPagination.page - 1)
                          }
                        >
                          Anterior
                        </button>
                        <span>
                          Página {patientPagination.page} de{" "}
                          {patientPagination.pages} · {patientPagination.total}{" "}
                          pacientes
                        </span>
                        <button
                          className="secondary small"
                          disabled={
                            patientPagination.page >= patientPagination.pages
                          }
                          onClick={() =>
                            void goToPatientPage(patientPagination.page + 1)
                          }
                        >
                          Próxima
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <ul className="data-list">
                    {patients.map((patient) => (
                      <li key={patient.id}>
                        <button
                          className="patient-row"
                          onClick={() => void openDetails(patient.id)}
                        >
                          <span className="list-avatar">
                            {patient.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span>
                            <strong>{patient.name}</strong>
                            <small>
                              {patient.document ?? "Sem documento informado"}
                            </small>
                          </span>
                          <b>›</b>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {(view === "dashboard" || view === "reports") && (
              <section className="panel" id="avaliacoes">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">Acompanhamento</span>
                    <h2>{view === "reports" ? "Laudos" : "Avaliações"}</h2>
                  </div>
                  <div className="panel-actions">
                    <span className="panel-count">{evaluations.length}</span>
                    {view === "reports" && (
                      <button
                        className="small"
                        type="button"
                        onClick={() => setReportFormOpen(true)}
                      >
                        Novo laudo
                      </button>
                    )}
                  </div>
                </div>
                {view === "dashboard" && (
                  <form onSubmit={createEvaluation} className="stack-form">
                    <label>
                      Paciente
                      <select
                        value={patientId}
                        onChange={(event) => setPatientId(event.target.value)}
                        required
                      >
                        <option value="">Selecione um paciente</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="form-row">
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Descrição da avaliação"
                        required
                      />
                      <button type="submit">Criar</button>
                    </div>
                  </form>
                )}
                <form onSubmit={searchEvaluations} className="filter-form">
                  <input
                    placeholder="Buscar avaliação"
                    value={evaluationSearch}
                    onChange={(event) =>
                      setEvaluationSearch(event.target.value)
                    }
                  />
                  <select
                    value={evaluationStatus}
                    onChange={(event) =>
                      setEvaluationStatus(event.target.value)
                    }
                  >
                    <option value="">Todos os status</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="COMPLETED">Concluída</option>
                  </select>
                  <button className="secondary" type="submit">
                    Filtrar
                  </button>
                </form>
                {loading ? (
                  <p className="muted empty-state">Carregando avaliações...</p>
                ) : evaluations.length === 0 ? (
                  <p className="muted empty-state">
                    Nenhuma avaliação encontrada.
                  </p>
                ) : view === "reports" ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Paciente</th>
                          <th>Laudo</th>
                          <th>Testes</th>
                          <th>Status</th>
                          <th aria-label="Ações" />
                        </tr>
                      </thead>
                      <tbody>
                        {evaluations.map((evaluation) => (
                          <tr key={evaluation.id}>
                            <td>
                              {new Date(
                                evaluation.createdAt,
                              ).toLocaleDateString("pt-BR")}
                            </td>
                            <td>{evaluation.patient.name}</td>
                            <td>{evaluation.title}</td>
                            <td>{evaluation.applications?.length ?? 0}</td>
                            <td>
                              <span className="status">
                                {evaluation.status}
                              </span>
                            </td>
                            <td>
                              <button
                                className="small"
                                onClick={() => void openReport(evaluation.id)}
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <ul className="data-list evaluation-list">
                    {evaluations.map((evaluation) => (
                      <li key={evaluation.id}>
                        <div>
                          <strong>{evaluation.title}</strong>
                          <span>{evaluation.patient.name}</span>
                        </div>
                        <div className="evaluation-actions">
                          <span className="status">{evaluation.status}</span>
                          <button
                            className="small"
                            onClick={() => openInstrumentPicker(evaluation)}
                          >
                            Abrir
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
        {view === "editor" && selectedEvaluation && (
          <section className="report-editor">
            <aside className="report-outline">
              <span className="section-kicker">Capítulos</span>
              <button
                className={reportChapter === "identification" ? "active" : ""}
                onClick={() => setReportChapter("identification")}
              >
                Identificação
              </button>
              <button
                className={reportChapter === "demand" ? "active" : ""}
                onClick={() => setReportChapter("demand")}
              >
                Descrição da demanda
              </button>
              <button
                className={reportChapter === "anamnesis" ? "active" : ""}
                onClick={() => setReportChapter("anamnesis")}
              >
                Anamnese
              </button>
              <button
                className={reportChapter === "conclusion" ? "active" : ""}
                onClick={() => setReportChapter("conclusion")}
              >
                Conclusão
              </button>
              <button
                className={reportChapter === "referral" ? "active" : ""}
                onClick={() => setReportChapter("referral")}
              >
                Encaminhamento
              </button>
              <div className="report-outline-tests">
                <span className="section-kicker">Testes</span>
                {selectedEvaluation.applications?.map((item) => (
                  <button
                    className="outline-application"
                    key={item.id}
                    onClick={() => void openApplication(item.id)}
                  >
                    <span>
                      {item.instrumentVersion?.instrument.name ?? "Instrumento"}
                    </span>
                    <small>{item.status}</small>
                    <small>
                      Versão {item.instrumentVersion?.version ?? "-"}
                    </small>
                  </button>
                ))}
                <button
                  onClick={() => openInstrumentPicker(selectedEvaluation)}
                >
                  + Adicionar teste
                </button>
              </div>
            </aside>
            <div className="panel report-editor-content">
              <div className="report-editor-heading">
                <div>
                  <span className="section-kicker">
                    {selectedEvaluation.status}
                  </span>
                  <h2>{selectedEvaluation.title}</h2>
                  <p className="muted">
                    {selectedEvaluation.patient.name}
                    {patientAge(selectedEvaluation.patient.birthDate) !== null
                      ? ` · ${patientAge(selectedEvaluation.patient.birthDate)} anos`
                      : ""}
                  </p>
                </div>
                <div className="report-editor-actions">
                  {selectedEvaluation.applications?.some(
                    (item) => item.status === "LOCKED",
                  ) && (
                    <button onClick={() => void generateReport()}>
                      Exportar PDF
                    </button>
                  )}
                  <button
                    className="secondary"
                    onClick={() => navigate("reports")}
                  >
                    Voltar aos laudos
                  </button>
                </div>
              </div>
              {reportChapter === "identification" && (
                <div className="chapter-form">
                  <h3>Identificação do laudo</h3>
                  <label>
                    Autoria
                    <input value={profile?.name ?? ""} disabled />
                  </label>
                  <label>
                    Solicitante
                    <input
                      value={reportContent.requester}
                      onChange={(event) =>
                        setReportContent({
                          ...reportContent,
                          requester: event.target.value,
                        })
                      }
                      placeholder="Quem solicitou o laudo"
                    />
                  </label>
                  <label>
                    Finalidade
                    <textarea
                      rows={5}
                      value={reportContent.purpose}
                      onChange={(event) =>
                        setReportContent({
                          ...reportContent,
                          purpose: event.target.value,
                        })
                      }
                      placeholder="Motivo e contexto de utilização do documento"
                    />
                  </label>
                </div>
              )}
              {reportChapter === "demand" && (
                <div className="chapter-form">
                  <h3>Descrição da demanda</h3>
                  <label>
                    Demanda apresentada
                    <textarea
                      rows={12}
                      value={reportContent.demandDescription}
                      onChange={(event) =>
                        setReportContent({
                          ...reportContent,
                          demandDescription: event.target.value,
                        })
                      }
                      placeholder="Inclua quem solicitou a avaliação, o motivo principal e as situações em que as dificuldades aparecem."
                    />
                  </label>
                </div>
              )}
              {reportChapter === "anamnesis" && (
                <div className="chapter-form">
                  <h3>Anamnese</h3>
                  <label>
                    História pessoal e desenvolvimento
                    <textarea
                      rows={5}
                      value={reportContent.anamnesis.personalHistory}
                      onChange={(event) =>
                        setReportContent({
                          ...reportContent,
                          anamnesis: {
                            ...reportContent.anamnesis,
                            personalHistory: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Contexto familiar e relacional
                    <textarea
                      rows={5}
                      value={reportContent.anamnesis.familyContext}
                      onChange={(event) =>
                        setReportContent({
                          ...reportContent,
                          anamnesis: {
                            ...reportContent.anamnesis,
                            familyContext: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Histórico médico e psiquiátrico
                    <textarea
                      rows={5}
                      value={reportContent.anamnesis.medicalHistory}
                      onChange={(event) =>
                        setReportContent({
                          ...reportContent,
                          anamnesis: {
                            ...reportContent.anamnesis,
                            medicalHistory: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Fatores psicossociais e ambientais
                    <textarea
                      rows={5}
                      value={reportContent.anamnesis.psychosocialFactors}
                      onChange={(event) =>
                        setReportContent({
                          ...reportContent,
                          anamnesis: {
                            ...reportContent.anamnesis,
                            psychosocialFactors: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                </div>
              )}
              {reportChapter === "conclusion" && (
                <div className="chapter-form">
                  <h3>Conclusão</h3>
                  <label>
                    Conclusão profissional
                    <textarea
                      rows={12}
                      value={reportContent.conclusion}
                      onChange={(event) =>
                        setReportContent({
                          ...reportContent,
                          conclusion: event.target.value,
                        })
                      }
                      placeholder="Registre a síntese profissional após revisar os dados e resultados."
                    />
                  </label>
                </div>
              )}
              {reportChapter === "referral" && (
                <div className="chapter-form">
                  <h3>Encaminhamento</h3>
                  <label>
                    Recomendações e encaminhamentos
                    <textarea
                      rows={12}
                      value={reportContent.referral}
                      onChange={(event) =>
                        setReportContent({
                          ...reportContent,
                          referral: event.target.value,
                        })
                      }
                      placeholder="Registre orientações, recomendações e encaminhamentos pertinentes."
                    />
                  </label>
                </div>
              )}
              <div className="chapter-actions">
                <button onClick={() => void saveReportChapter()}>
                  Salvar capítulo
                </button>
              </div>
              {reports.length > 0 && (
                <div className="report-history editor-report-history">
                  <div className="panel-heading">
                    <div>
                      <span className="section-kicker">Documentos</span>
                      <h3>Revisões geradas</h3>
                    </div>
                  </div>
                  <ul className="data-list">
                    {reports.map((report) => (
                      <li key={report.id}>
                        <div>
                          <strong>Revisão {report.revision}</strong>
                          <span>
                            {new Date(report.generatedAt).toLocaleString(
                              "pt-BR",
                            )}
                          </span>
                        </div>
                        <button
                          className="small"
                          onClick={() => void previewReport(report.id)}
                        >
                          Visualizar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
        {view === "editor" && !selectedEvaluation && (
          <section className="panel empty-view">
            <span className="section-kicker">Nenhum laudo selecionado</span>
            <h2>Abra um laudo para começar a editar</h2>
            <button onClick={() => navigate("reports")}>Ir para laudos</button>
          </section>
        )}
        {application && view === "results" && (
          <section className="panel workspace" id="workspace">
            <div className="workspace-header">
              <div>
                <span className="section-kicker">Aplicação ativa</span>
                <h2>{application.instrumentVersion.instrument.name}</h2>
                <p className="muted">
                  Versão {application.instrumentVersion.version} ·{" "}
                  {selectedEvaluation?.patient.name}
                </p>
              </div>
              <span className="status">{application.status}</span>
            </div>
            <div
              className="tab-list application-tabs"
              role="tablist"
              aria-label="Seções do teste"
            >
              <button
                className={applicationTab === "test" ? "active" : ""}
                type="button"
                onClick={() => setApplicationTab("test")}
              >
                Teste
              </button>
              <button
                className={applicationTab === "results" ? "active" : ""}
                type="button"
                onClick={() => setApplicationTab("results")}
              >
                Resultados
              </button>
              <button
                className={applicationTab === "details" ? "active" : ""}
                type="button"
                onClick={() => setApplicationTab("details")}
              >
                Detalhes
              </button>
            </div>
            {applicationTab === "test" && (
              <>
                <div className="form-sections">
                  {application.instrumentVersion.formSchema.sections.map(
                    (section) => (
                      <div key={section.id}>
                        <h3>{section.title}</h3>
                        {section.fields.map((field) => (
                          <div className="instrument-field" key={field.id}>
                            <span>
                              {field.label}
                              {field.required ? " *" : ""}
                            </span>
                            <InstrumentFieldControl
                              field={field}
                              value={answers[field.id]}
                              disabled={!canEdit}
                              onChange={(value) =>
                                setAnswers({ ...answers, [field.id]: value })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ),
                  )}
                </div>
                <div className="actions">
                  {canEdit && (
                    <>
                      <button
                        className="secondary"
                        onClick={() => void saveAnswers()}
                      >
                        Salvar rascunho
                      </button>
                      <button onClick={() => void calculate()}>
                        Calcular resultado
                      </button>
                    </>
                  )}
                  {application.status === "CALCULATED" && (
                    <button onClick={() => void review()}>
                      Confirmar revisão
                    </button>
                  )}
                  {application.status === "REVIEWED" && (
                    <button onClick={() => void lock()}>
                      Bloquear aplicação
                    </button>
                  )}
                  {application.status === "LOCKED" && (
                    <>
                      <button onClick={() => void generateReport()}>
                        Gerar e visualizar PDF
                      </button>
                      <button
                        className="secondary"
                        onClick={() => void reopen()}
                      >
                        Reabrir
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            {applicationTab === "results" &&
              (application.result ? (
                <div className="result-area">
                  <h3>Síntese profissional</h3>
                  <label>
                    Revise o resultado e escreva sua síntese
                    <textarea
                      disabled={application.status === "LOCKED"}
                      value={summary}
                      onChange={(event) => setSummary(event.target.value)}
                      rows={5}
                    />
                  </label>
                  <div className="result result-table-wrap">
                    <table className="result-table">
                      <thead>
                        <tr>
                          <th>Indicador</th>
                          <th>Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(application.result).map(
                          ([key, value]) => (
                            <tr key={key}>
                              <td>{key.replaceAll("_", " ")}</td>
                              <td>
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="muted empty-state">
                  Calcule o instrumento para visualizar os resultados.
                </p>
              ))}
            {applicationTab === "details" && (
              <dl className="patient-readonly-grid application-details">
                <div>
                  <dt>Instrumento</dt>
                  <dd>{application.instrumentVersion.instrument.name}</dd>
                </div>
                <div>
                  <dt>Versão</dt>
                  <dd>{application.instrumentVersion.version}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{application.status}</dd>
                </div>
                <div>
                  <dt>Aplicação</dt>
                  <dd>{application.id}</dd>
                </div>
              </dl>
            )}
            <div className="report-history" id="relatorios">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Documentos</span>
                  <h3>Histórico de PDFs</h3>
                </div>
              </div>
              {reports.length === 0 ? (
                <p className="muted">Nenhum PDF gerado para esta avaliação.</p>
              ) : (
                <ul className="data-list">
                  {reports.map((report) => (
                    <li key={report.id}>
                      <div>
                        <strong>Revisão {report.revision}</strong>
                        <span>
                          {new Date(report.generatedAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <button
                        className="small"
                        onClick={() => previewReport(report.id)}
                      >
                        Visualizar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
        {view === "results" && !application && (
          <section className="panel empty-view">
            <span className="section-kicker">
              Nenhuma aplicação selecionada
            </span>
            <h2>Abra um laudo para ver os resultados</h2>
            <p className="muted">
              Selecione um laudo e inicie uma aplicação para preencher e revisar
              seus resultados aqui.
            </p>
            <button onClick={() => navigate("reports")}>Ir para laudos</button>
          </section>
        )}
        {view === "profile" && profile && (
          <section className="panel profile-page">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Dados profissionais</span>
                <h2>Minha conta</h2>
              </div>
            </div>
            <form onSubmit={saveProfile}>
              <label>
                Nome
                <input
                  value={profile.name}
                  onChange={(event) =>
                    setProfile({ ...profile, name: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                E-mail
                <input value={profile.email} disabled />
              </label>
              <label>
                Registro profissional
                <input
                  value={profile.professionalRegistration ?? ""}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      professionalRegistration: event.target.value,
                    })
                  }
                />
              </label>
              <div className="form-section-title">
                Informações profissionais
              </div>
              <div className="form-grid">
                <label>
                  CPF
                  <input
                    value={profile.document ?? ""}
                    onChange={(event) =>
                      setProfile({ ...profile, document: event.target.value })
                    }
                  />
                </label>
                <label>
                  Telefone
                  <input
                    value={profile.phone ?? ""}
                    onChange={(event) =>
                      setProfile({ ...profile, phone: event.target.value })
                    }
                  />
                </label>
                <label className="form-grid-wide">
                  Especialidades
                  <input
                    value={(profile.specialties ?? []).join(", ")}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        specialties: event.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Ex.: Neuropsicologia, Psicologia clínica"
                  />
                </label>
              </div>
              <label>
                Apresentação profissional
                <textarea
                  rows={4}
                  value={profile.professionalBio ?? ""}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      professionalBio: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Texto de assinatura
                <textarea
                  rows={3}
                  value={profile.signatureText ?? ""}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      signatureText: event.target.value,
                    })
                  }
                  placeholder="Nome profissional, CRP e informações de rodapé"
                />
              </label>
              <div className="form-section-title">Organização</div>
              <div className="form-grid">
                <label className="form-grid-wide">
                  Nome da organização
                  <input
                    value={profile.organization?.name ?? ""}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        organization: {
                          ...profile.organization,
                          name: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label>
                  E-mail da organização
                  <input
                    type="email"
                    value={profile.organization?.email ?? ""}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        organization: {
                          ...profile.organization,
                          name: profile.organization?.name ?? "",
                          email: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Telefone da organização
                  <input
                    value={profile.organization?.phone ?? ""}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        organization: {
                          ...profile.organization,
                          name: profile.organization?.name ?? "",
                          phone: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              </div>
              <button type="submit">Salvar alterações</button>
              <div className="profile-privacy-actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => void exportMyData()}
                >
                  Exportar meus dados
                </button>
                <button
                  className="danger"
                  type="button"
                  onClick={() => void requestClosure()}
                >
                  Solicitar encerramento da conta
                </button>
              </div>
            </form>
          </section>
        )}
        {view === "settings" && (
          <section className="panel empty-view">
            <span className="section-kicker">Em preparação</span>
            <h2>Configurações da organização</h2>
            <p className="muted">
              Esta área receberá os dados institucionais, a identidade do
              documento e as permissões de acesso nas próximas fases.
            </p>
          </section>
        )}
        {instrumentPickerOpen && selectedEvaluation && (
          <div
            className="modal-backdrop"
            onClick={() => setInstrumentPickerOpen(false)}
          >
            <form
              className="modal-card"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => {
                event.preventDefault();
                void startApplication(selectedEvaluation, instrumentVersionId);
              }}
            >
              <button
                className="modal-close"
                type="button"
                onClick={() => setInstrumentPickerOpen(false)}
              >
                ×
              </button>
              <span className="section-kicker">Adicionar teste</span>
              <h2>Selecionar instrumento</h2>
              <p className="muted">
                Escolha uma versão publicada para este laudo.
              </p>
              <label>
                Instrumento
                <select
                  value={instrumentVersionId}
                  onChange={(event) =>
                    setInstrumentVersionId(event.target.value)
                  }
                  required
                >
                  <option value="">Selecione um instrumento</option>
                  {instruments.flatMap((instrument) =>
                    instrument.versions.map((version) => (
                      <option key={version.id} value={version.id}>
                        {instrument.name} · versão {version.version}
                      </option>
                    )),
                  )}
                </select>
              </label>
              <button type="submit">Adicionar teste</button>
            </form>
          </div>
        )}
        {reportFormOpen && (
          <div
            className="modal-backdrop"
            onClick={() => setReportFormOpen(false)}
          >
            <form
              className="modal-card"
              onClick={(event) => event.stopPropagation()}
              onSubmit={createEvaluation}
            >
              <button
                className="modal-close"
                type="button"
                onClick={() => setReportFormOpen(false)}
              >
                ×
              </button>
              <span className="section-kicker">Novo laudo</span>
              <h2>Criar laudo</h2>
              <p className="muted">
                Selecione o paciente e dê um título para iniciar o processo
                avaliativo.
              </p>
              <label>
                Paciente
                <select
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {details && !patients.some((patient) => patient.id === details.id) && (
                    <option value={details.id}>{details.name}</option>
                  )}
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Título do laudo
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex.: Avaliação neuropsicológica"
                  required
                />
              </label>
              <button type="submit">Criar laudo</button>
            </form>
          </div>
        )}
        {patientFormOpen && (
          <div
            className={`modal-backdrop ${isPatientEditPage ? "patient-edit-page" : ""}`}
            onClick={() => {
              if (!isPatientEditPage) setPatientFormOpen(false);
            }}
          >
            <form
              className="modal-card patient-form"
              role={isPatientEditPage ? undefined : "dialog"}
              aria-modal={isPatientEditPage ? undefined : true}
              aria-labelledby="patient-form-title"
              onClick={(event) => event.stopPropagation()}
              onSubmit={createFullPatient}
            >
              <button
                className={isPatientEditPage ? "patient-edit-back" : "modal-close"}
                type="button"
                aria-label={isPatientEditPage ? "Voltar para o paciente" : "Fechar cadastro"}
                onClick={() => {
                  setPatientFormOpen(false);
                  if (isPatientEditPage && editingPatientId)
                    routerNavigate(`/pacientes/${editingPatientId}`);
                }}
              >
                {isPatientEditPage ? "← Voltar para o paciente" : "×"}
              </button>
              <div className="patient-form-heading">
                <span className="section-kicker">Cadastro de pacientes</span>
                <h2 id="patient-form-title">
                  {editingPatientId ? "Editar paciente" : "Novo paciente"}
                </h2>
                <p>Preencha os dados principais para manter o cadastro organizado.</p>
              </div>
              <div className="form-grid patient-primary-fields">
                <label className="form-grid-wide">
                  <span>Nome completo <span className="required-mark">*</span></span>
                  <input
                    value={patientForm.name}
                    placeholder="Digite o nome completo"
                    autoFocus
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        name: event.target.value,
                      })
                    }
                    required
                  />
                </label>
                <label>
                  <span>
                    Data de nascimento
                    {!editingPatientId && <span className="required-mark"> *</span>}
                  </span>
                  <input
                    type="date"
                    value={patientForm.birthDate ?? ""}
                    max={new Date().toISOString().slice(0, 10)}
                    required={!editingPatientId}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        birthDate: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  CPF
                  <input
                    value={patientForm.document ?? ""}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        document: formatCpf(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  E-mail
                  <input
                    type="email"
                    value={patientForm.email ?? ""}
                    placeholder="nome@exemplo.com"
                    onChange={(event) =>
                      setPatientForm({ ...patientForm, email: event.target.value })
                    }
                  />
                </label>
                <label>
                  Telefone
                  <input
                    type="tel"
                    value={patientForm.phone ?? ""}
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    onChange={(event) =>
                      setPatientForm({ ...patientForm, phone: formatPhone(event.target.value) })
                    }
                  />
                </label>
              </div>
              <details className="patient-extra-fields">
                <summary>Informações complementares</summary>
                <div className="form-section-title">Dados pessoais</div>
                <div className="form-grid">
                <label>
                  Gênero
                  <select
                    value={patientForm.gender ?? ""}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        gender: event.target.value,
                      })
                    }
                  >
                    <option value="">Não informado</option>
                    <option value="FEMININO">Feminino</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </label>
                <label>
                  Escolaridade
                  <input
                    value={patientForm.education ?? ""}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        education: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Plano de saúde
                  <input
                    value={patientForm.healthPlan ?? ""}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        healthPlan: event.target.value,
                      })
                    }
                  />
                </label>
                </div>
                <div className="form-section-title">Responsáveis</div>
                <div className="form-grid">
                <label>
                  Responsável 1
                  <input
                    value={patientForm.responsible1Name ?? ""}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        responsible1Name: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Telefone responsável 1
                  <input
                    value={patientForm.responsible1Phone ?? ""}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        responsible1Phone: formatPhone(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Responsável 2
                  <input
                    value={patientForm.responsible2Name ?? ""}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        responsible2Name: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Telefone responsável 2
                  <input
                    value={patientForm.responsible2Phone ?? ""}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        responsible2Phone: formatPhone(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <div className="form-section-title">Endereço</div>
              <div className="form-grid">
                <label>
                  CEP
                  <input
                    value={patientForm.address?.cep ?? ""}
                    onChange={(event) =>
                      updatePatientAddress("cep", formatCep(event.target.value))
                    }
                  />
                </label>
                <label>
                  Estado
                  <input
                    value={patientForm.address?.state ?? ""}
                    onChange={(event) =>
                      updatePatientAddress("state", event.target.value)
                    }
                  />
                </label>
                <label>
                  Cidade
                  <input
                    value={patientForm.address?.city ?? ""}
                    onChange={(event) =>
                      updatePatientAddress("city", event.target.value)
                    }
                  />
                </label>
                <label>
                  Bairro
                  <input
                    value={patientForm.address?.district ?? ""}
                    onChange={(event) =>
                      updatePatientAddress("district", event.target.value)
                    }
                  />
                </label>
                <label className="form-grid-wide">
                  Rua
                  <input
                    value={patientForm.address?.street ?? ""}
                    onChange={(event) =>
                      updatePatientAddress("street", event.target.value)
                    }
                  />
                </label>
                <label>
                  Número
                  <input
                    value={patientForm.address?.number ?? ""}
                    onChange={(event) =>
                      updatePatientAddress("number", event.target.value)
                    }
                  />
                </label>
                <label>
                  Complemento
                  <input
                    value={patientForm.address?.complement ?? ""}
                    onChange={(event) =>
                      updatePatientAddress("complement", event.target.value)
                    }
                  />
                </label>
              </div>
              <label>
                Anotações
                <textarea
                  rows={4}
                  value={patientForm.notes ?? ""}
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      notes: event.target.value,
                    })
                  }
                />
              </label>
              </details>
              {patientFormError && <p className="error" role="alert">{patientFormError}</p>}
              <div className="patient-form-actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setPatientFormOpen(false);
                    if (isPatientEditPage && editingPatientId)
                      routerNavigate(`/pacientes/${editingPatientId}`);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={savingPatient}>
                  {savingPatient ? "Salvando..." : editingPatientId ? "Salvar alterações" : "Adicionar paciente"}
                </button>
              </div>
            </form>
          </div>
        )}
        {view === "patient" && (
          <section className="patient-page">
            <button
              className="patient-back-button"
              type="button"
              onClick={() => navigate("patients")}
            >
              ← Voltar para pacientes
            </button>
            {patientDetailLoading ? (
              <div className="panel patient-detail-panel">
                <p className="muted">Carregando paciente...</p>
              </div>
            ) : patientDetailError ? (
              <div className="panel patient-detail-panel">
                <p className="error" role="alert">{patientDetailError}</p>
              </div>
            ) : details ? (
            <div className="panel patient-detail-panel">
              <div className="patient-page-heading">
                <span className="patient-page-avatar" aria-hidden="true">
                  {details.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="patient-page-identity">
                  <span className="section-kicker">Cadastro do paciente</span>
                  <h2>{details.name}</h2>
                  <p>
                    {patientAge(details.birthDate) !== null
                      ? `${patientAge(details.birthDate)} anos · `
                      : ""}
                    {details.document ? `CPF ${formatCpf(details.document)}` : "Sem CPF informado"}
                  </p>
                </div>
                <div className="patient-detail-buttons">
                  <button
                    className="patient-action-primary"
                    type="button"
                    onClick={() => createReportForPatient(details)}
                  >
                    Novo laudo
                  </button>
                  <button
                    className="small secondary"
                    type="button"
                    onClick={() => openPatientForm(details)}
                  >
                    Editar
                  </button>
                  <button
                    className="small danger"
                    type="button"
                    onClick={() => void archivePatient(details.id)}
                  >
                    Arquivar
                  </button>
                </div>
              </div>
              <div className="patient-page-content">
              <div
                className="tab-list"
                role="tablist"
                aria-label="Seções do paciente"
              >
                <button
                  className={patientDetailsTab === "data" ? "active" : ""}
                  type="button"
                  onClick={() => setPatientDetailsTab("data")}
                >
                  Dados
                </button>
                <button
                  className={patientDetailsTab === "address" ? "active" : ""}
                  type="button"
                  onClick={() => setPatientDetailsTab("address")}
                >
                  Endereço
                </button>
                <button
                  className={patientDetailsTab === "reports" ? "active" : ""}
                  type="button"
                  onClick={() => setPatientDetailsTab("reports")}
                >
                  Laudos
                </button>
                <button
                  className={patientDetailsTab === "notes" ? "active" : ""}
                  type="button"
                  onClick={() => setPatientDetailsTab("notes")}
                >
                  Anotações
                </button>
              </div>
              {patientDetailsTab === "data" && (
                <dl className="patient-readonly-grid">
                  <div>
                    <dt>Data de nascimento</dt>
                    <dd>
                      {details.birthDate
                        ? new Date(details.birthDate).toLocaleDateString(
                            "pt-BR",
                          )
                        : "Não informada"}
                    </dd>
                  </div>
                  <div>
                    <dt>Gênero</dt>
                    <dd>{details.gender ?? "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>E-mail</dt>
                    <dd>{details.email ?? "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Telefone</dt>
                    <dd>{details.phone ?? "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Escolaridade</dt>
                    <dd>{details.education ?? "Não informada"}</dd>
                  </div>
                  <div>
                    <dt>Plano de saúde</dt>
                    <dd>{details.healthPlan ?? "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Responsável 1</dt>
                    <dd>
                      {details.responsible1Name
                        ? `${details.responsible1Name}${details.responsible1Phone ? ` · ${details.responsible1Phone}` : ""}`
                        : "Não informado"}
                    </dd>
                  </div>
                  <div>
                    <dt>Responsável 2</dt>
                    <dd>
                      {details.responsible2Name
                        ? `${details.responsible2Name}${details.responsible2Phone ? ` · ${details.responsible2Phone}` : ""}`
                        : "Não informado"}
                    </dd>
                  </div>
                </dl>
              )}
              {patientDetailsTab === "address" && (
                <dl className="patient-readonly-grid">
                  <div>
                    <dt>CEP</dt>
                    <dd>{details.address?.cep || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>{details.address?.state || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Cidade</dt>
                    <dd>{details.address?.city || "Não informada"}</dd>
                  </div>
                  <div>
                    <dt>Bairro</dt>
                    <dd>{details.address?.district || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Rua</dt>
                    <dd>{details.address?.street || "Não informada"}</dd>
                  </div>
                  <div>
                    <dt>Número</dt>
                    <dd>{details.address?.number || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Complemento</dt>
                    <dd>{details.address?.complement || "Não informado"}</dd>
                  </div>
                </dl>
              )}
              {patientDetailsTab === "reports" &&
                (details.evaluations.length === 0 ? (
                  <p className="muted">Nenhum laudo registrado.</p>
                ) : (
                  <ul className="data-list">
                    {details.evaluations.map((item) => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.title}</strong>
                          <span>
                            {new Date(item.createdAt).toLocaleDateString(
                              "pt-BR",
                            )}{" "}
                            · {item.applications.length} aplicação(ões)
                          </span>
                        </div>
                        <span className="status">{item.status}</span>
                      </li>
                    ))}
                  </ul>
                ))}
              {patientDetailsTab === "notes" && (
                <div className="notes-panel">
                  {editingNotes ? (
                    <>
                      <textarea
                        rows={7}
                        value={notesDraft}
                        onChange={(event) => setNotesDraft(event.target.value)}
                        placeholder="Registre anotações administrativas do paciente."
                      />
                      <div className="patient-detail-buttons">
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => {
                            setEditingNotes(false);
                            setNotesDraft(details.notes ?? "");
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => void savePatientNotes()}
                        >
                          Salvar anotações
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="patient-notes">
                        {details.notes || "Nenhuma anotação registrada."}
                      </p>
                      <button
                        className="small secondary"
                        type="button"
                        onClick={() => setEditingNotes(true)}
                      >
                        Editar anotações
                      </button>
                    </>
                  )}
                  {patientAudit.length > 0 && (
                    <div className="notes-audit">
                      <strong>Histórico de alterações</strong>
                      <ul>
                        {patientAudit.map((event) => (
                          <li key={event.id}>
                            {event.event === "PATIENT_NOTES_UPDATED"
                              ? "Anotações atualizadas"
                              : event.event.replaceAll("_", " ")}{" "}
                            ·{" "}
                            {new Date(event.createdAt).toLocaleString("pt-BR")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
            ) : null}
          </section>
        )}
        {profileOpen && profile && (
          <div className="modal-backdrop" onClick={() => setProfileOpen(false)}>
            <form
              className="modal-card"
              onClick={(event) => event.stopPropagation()}
              onSubmit={saveProfile}
            >
              <button
                className="modal-close"
                type="button"
                onClick={() => setProfileOpen(false)}
              >
                ×
              </button>
              <span className="section-kicker">Perfil profissional</span>
              <h2>Minha conta</h2>
              <label>
                Nome
                <input
                  value={profile.name}
                  onChange={(event) =>
                    setProfile({ ...profile, name: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                E-mail
                <input value={profile.email} disabled />
              </label>
              <label>
                Registro profissional
                <input
                  value={profile.professionalRegistration ?? ""}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      professionalRegistration: event.target.value,
                    })
                  }
                />
              </label>
              <button type="submit">Salvar alterações</button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState(
    Boolean(localStorage.getItem("laudo_token")),
  );
  useEffect(() => {
    const expire = () => setAuthenticated(false);
    window.addEventListener("laudo-session-expired", expire);
    return () => window.removeEventListener("laudo-session-expired", expire);
  }, []);
  return authenticated ? (
    <Dashboard onLogout={() => setAuthenticated(false)} />
  ) : (
    <Login onLogin={() => setAuthenticated(true)} />
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
