import { FormEvent, useEffect, useRef, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./styles.css";
import "./ios.css";
import "./clean.css";
import { APP_NAME, APP_TAGLINE, BrandMark } from "./brand";
import {
  CheckSealIcon,
  ChecklistIcon,
  CloseIcon,
  DocIcon,
  GearIcon,
  HomeIcon,
  InfoIcon,
  LogoutIcon,
  MenuIcon,
  PeopleIcon,
  PersonCircleIcon,
  SidebarIcon,
} from "./icons";
import {
  AppearanceControls,
  ThemeToggle,
  useThemePreferences,
  type ThemePreferences,
} from "./theme";
import { SnapIvCard, SnapIvPage } from "./snap-iv";
import { SnapIvResults } from "./snap-iv-results";
import { ScaredCCard, ScaredCPage } from "./scared-c";
import { ScaredPCard, ScaredPPage, ScaredPResults } from "./scared-p";
import { BaiCard, BaiPage } from "./bai";
import { InstrumentFieldControl, type InstrumentField } from "./instrument-field";

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

function ReportExportMenu({ onSelect }: { onSelect: (destination: "pdf" | "googleDocs") => void }) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const menu = menuRef.current;
      if (menu && event.target instanceof Node && !menu.contains(event.target))
        menu.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      const menu = menuRef.current;
      if (event.key === "Escape" && menu?.open) {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const select = (destination: "pdf" | "googleDocs") => {
    if (menuRef.current) menuRef.current.open = false;
    onSelect(destination);
  };

  return (
    <details
      ref={menuRef}
      className="report-export-menu report-export-trigger"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.open = false;
      }}
    >
      <summary><span>Exportar laudo</span></summary>
      <div>
        <span className="report-export-menu-label">Escolha o formato</span>
        <button type="button" onClick={() => select("pdf")}>
          <strong>PDF</strong>
          <small>Arquivo pronto para imprimir</small>
        </button>
        <button type="button" onClick={() => select("googleDocs")}>
          <strong>Google Docs</strong>
          <small>Documento editável na nuvem</small>
        </button>
      </div>
    </details>
  );
}

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
  applicationDate?: string | null;
  applications?: Array<{
    id: string;
    status: string;
    instrumentVersion?: { id: string; version: string; instrument: { name: string } };
  }>;
  requester?: string | null;
  purpose?: string | null;
  demandDescription?: string | null;
  anamnesis?: Record<string, string> | null;
  conclusion?: string | null;
  referral?: string | null;
  patient: Patient;
};
type Instrument = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  versions: Array<{
    id: string;
    version: string;
    sourceMetadata?: {
      platform?: PlatformInstrumentMetadata;
      features?: { review?: boolean };
    } | null;
    formSchema: {
      sections: Array<{ id: string; title: string; fields: InstrumentField[] }>;
    };
  }>;
};
type PlatformInstrumentMetadata = {
  subtitle: string;
  audience: string;
  authors: string;
  itemCount: number;
  format: string;
  purpose: string;
  domains: string[];
  professionalUse: string;
  applicationEnabled: boolean;
};
type Application = {
  id: string;
  status: string;
  answers?: Record<string, unknown>;
  result?: Record<string, unknown>;
  professionalSummary?: string | null;
  evaluation?: { id: string };
  instrumentVersion: Instrument["versions"][number] & {
    instrument: { name: string; code?: string };
  };
};
type Report = { id: string; revision: number; generatedAt: string };
type ReportExportSettings = {
  chapters: Record<string, boolean>;
  tests: Record<string, { table: boolean; chart: boolean }>;
};
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
  | "platformTests"
  | "platformTest"
  | "profile"
  | "settings";

const viewFromPathname = (pathname: string): WorkspaceView => {
  if (/^\/testes-da-plataforma\/[^/]+$/.test(pathname)) return "platformTest";
  if (/^\/laudos\/[^/]+$/.test(pathname)) return "editor";
  if (/^\/resultados\/[^/]+$/.test(pathname)) return "results";
  if (/^\/pacientes\/editar\/[^/]+$/.test(pathname)) return "patientEdit";
  if (/^\/pacientes\/[^/]+$/.test(pathname)) return "patient";
  switch (pathname) {
    case "/pacientes":
      return "patients";
    case "/laudos":
      return "reports";
    case "/resultados":
      return "results";
    case "/testes-da-plataforma":
      return "platformTests";
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
    platformTests: {
      title: "Testes da Plataforma",
      subtitle: "Conheça os instrumentos disponíveis para as avaliações.",
    },
    platformTest: {
      title: "Detalhes do instrumento",
      subtitle: "Informações técnicas e critérios de utilização do instrumento.",
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

type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  Icon: ComponentType<{ size?: number }>;
  end?: boolean;
  /** Rota-filha que também deve marcar o item como ativo. */
  activeView?: WorkspaceView;
  /** Exibido na tab bar inferior em telas pequenas. */
  inTabBar: boolean;
};

const navItems: NavItem[] = [
  { to: "/", label: "Visão geral", shortLabel: "Início", Icon: HomeIcon, end: true, inTabBar: true },
  { to: "/pacientes", label: "Pacientes", shortLabel: "Pacientes", Icon: PeopleIcon, inTabBar: true },
  { to: "/laudos", label: "Laudos", shortLabel: "Laudos", Icon: DocIcon, activeView: "editor", inTabBar: true },
  { to: "/testes-da-plataforma", label: "Testes da Plataforma", shortLabel: "Testes", Icon: ChecklistIcon, activeView: "platformTest", inTabBar: true },
  { to: "/perfil", label: "Perfil", shortLabel: "Perfil", Icon: PersonCircleIcon, inTabBar: true },
  { to: "/configuracoes", label: "Configurações", shortLabel: "Ajustes", Icon: GearIcon, inTabBar: false },
];

const statusLabel = (status?: string) =>
  ({
    DRAFT: "Rascunho",
    COMPLETED: "Concluída",
    NOT_STARTED: "Não iniciada",
    IN_PROGRESS: "Em andamento",
    REOPENED: "Reaberta",
    CALCULATED: "Calculada",
    REVIEWED: "Revisada",
    LOCKED: "Bloqueada",
    ACTIVE: "Ativo",
    ARCHIVED: "Arquivado",
    PUBLISHED: "Publicada",
  })[status ?? ""] ?? status ?? "—";

const statusClassName = (status?: string) =>
  `status status-${(status ?? "draft").toLowerCase().replaceAll("_", "-")}`;

const savedSnapIvFormCount = (answers: Record<string, unknown>) =>
  Math.max(
    1,
    ...Object.keys(answers)
      .map((fieldId) => fieldId.match(/^snap_iv_form_(\d+)(?:_|$)/)?.[1])
      .filter((formNumber): formNumber is string => Boolean(formNumber))
      .map(Number),
  );

const savedScaredPFormCount = (answers: Record<string, unknown>) =>
  Math.max(
    1,
    ...Object.keys(answers)
      .map((fieldId) => fieldId.match(/^scared_p_form_(\d+)(?:_|$)/)?.[1])
      .filter((formNumber): formNumber is string => Boolean(formNumber))
      .map(Number),
  );

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
            <BrandMark size={44} />
            <div>
              <strong>{APP_NAME}</strong>
              <small>{APP_TAGLINE}</small>
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

const greetingFor = (date: Date) => {
  const hour = date.getHours();
  if (hour < 5) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

function Dashboard({
  onLogout,
  theme,
}: {
  onLogout: () => void;
  theme: ThemePreferences;
}) {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const view = viewFromPathname(location.pathname);
  const patientRouteId =
    view === "patient"
      ? location.pathname.split("/")[2]
      : view === "patientEdit"
        ? location.pathname.split("/")[3]
        : null;
  const reportRouteId =
    view === "editor" ? location.pathname.split("/")[2] : null;
  const resultRouteId =
    view === "results" ? location.pathname.split("/")[2] : null;
  const isPatientEditPage = view === "patientEdit";
  const platformTestCode =
    view === "platformTest" ? location.pathname.split("/")[2]?.toUpperCase() : null;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patientFormOpen, setPatientFormOpen] = useState(false);
  const [patientForm, setPatientForm] = useState<PatientForm>(emptyPatientForm);
  const [patientFormError, setPatientFormError] = useState("");
  const [savingPatient, setSavingPatient] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [archivePatientId, setArchivePatientId] = useState<string | null>(null);
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
  const [quickPatientName, setQuickPatientName] = useState("");
  const [quickPatientBirthDate, setQuickPatientBirthDate] = useState("");
  const [applicationDate, setApplicationDate] = useState("");
  const [selectedInstrumentVersionIds, setSelectedInstrumentVersionIds] =
    useState<string[]>([]);
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
  const [activeEditorApplicationId, setActiveEditorApplicationId] = useState<string | null>(null);
  const [applicationTab, setApplicationTab] = useState<
    "test" | "results" | "details"
  >("test");
  const [snapIvFormTab, setSnapIvFormTab] = useState(1);
  const [snapIvFormCount, setSnapIvFormCount] = useState(1);
  const [scaredPFormTab, setScaredPFormTab] = useState(1);
  const [scaredPFormCount, setScaredPFormCount] = useState(1);
  const [asrsResultView, setAsrsResultView] = useState<"table" | "chart">(
    "table",
  );
  const [instrumentPickerOpen, setInstrumentPickerOpen] = useState(false);
  const [instrumentVersionId, setInstrumentVersionId] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [reportExportOpen, setReportExportOpen] = useState(false);
  const [reportExportDestination, setReportExportDestination] =
    useState<"pdf" | "googleDocs">("pdf");
  const [reportExportSettings, setReportExportSettings] =
    useState<ReportExportSettings>({ chapters: {}, tests: {} });
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("laudo_sidebar_collapsed") === "true",
  );
  const darkMode = theme.isDark;
  // Altura real da barra superior fixa, para que painéis "sticky" (ex.: índice do
  // editor de laudo) parem logo abaixo dela em vez de passar por baixo.
  const topbarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const topbar = topbarRef.current;
    if (!topbar) return;
    const root = document.documentElement;
    const update = () =>
      root.style.setProperty("--topbar-height", `${topbar.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(topbar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--topbar-height");
    };
  }, []);
  const [details, setDetails] = useState<PatientDetails | null>(null);
  const [patientDetailLoading, setPatientDetailLoading] = useState(false);
  const [patientDetailError, setPatientDetailError] = useState("");
  const [patientAudit, setPatientAudit] = useState<AuditEvent[]>([]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activity, setActivity] = useState<AuditEvent[]>([]);
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 5_000);
    return () => window.clearTimeout(timeout);
  }, [message]);
  useEffect(() => {
    localStorage.setItem("laudo_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  const platformInstruments = instruments.filter(
    (instrument) => !["SNAP-IV", "SCARED-C", "SCARED-P", "BAI"].includes(instrument.code) && instrument.versions[0]?.sourceMetadata?.platform,
  );
  const selectedPlatformInstrument = platformInstruments.find(
    (instrument) => instrument.code === platformTestCode,
  );
  const selectedPlatformMetadata =
    selectedPlatformInstrument?.versions[0]?.sourceMetadata?.platform;
  const availableInstrumentVersions = instruments.flatMap((instrument) =>
    instrument.versions
      .filter(
        (version) =>
          Boolean(version.sourceMetadata?.platform),
      )
      .map((version) => ({
        id: version.id,
        label: `${instrument.name} · versão ${version.version}`,
        enabled: version.sourceMetadata?.platform?.applicationEnabled === true,
      })),
  );
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
    if (view === "reports") void load();
  }, [view]);
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
  useEffect(() => {
    if (!reportRouteId || selectedEvaluation?.id === reportRouteId) return;
    void openReport(reportRouteId, false);
  }, [reportRouteId, selectedEvaluation?.id]);
  useEffect(() => {
    if (!resultRouteId || application?.id === resultRouteId) return;
    void openApplication(resultRouteId);
  }, [resultRouteId]);
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
      routerNavigate(`/pacientes/editar/${patient.id}`);
      window.scrollTo(0, 0);
    }
    setPatientFormOpen(true);
  };
  async function createEvaluation(event: FormEvent) {
    event.preventDefault();
    try {
      if (!applicationDate) {
        setMessage("Informe a data de aplicação do teste.");
        return;
      }
      let selectedPatientId = patientId;
      let selectedPatientName = patients.find(
        (patient) => patient.id === patientId,
      )?.name;
      if (!selectedPatientId) {
        if (!quickPatientName.trim() || !quickPatientBirthDate) {
          setMessage("Selecione um paciente ou informe nome e data de nascimento.");
          return;
        }
        const patient = await request<Patient>("/patients", {
          method: "POST",
          body: JSON.stringify({
            name: quickPatientName.trim(),
            birthDate: quickPatientBirthDate,
          }),
        });
        selectedPatientId = patient.id;
        selectedPatientName = patient.name;
      }
      const evaluation = await request<Evaluation>("/evaluations", {
        method: "POST",
        body: JSON.stringify({
          patientId: selectedPatientId,
          title: title.trim() || `Avaliação de ${selectedPatientName ?? "paciente"}`,
          applicationDate: applicationDate || undefined,
        }),
      });
      await Promise.all(
        selectedInstrumentVersionIds.map((instrumentVersionId) =>
          request(`/evaluations/${evaluation.id}/applications`, {
            method: "POST",
            body: JSON.stringify({ instrumentVersionId }),
          }),
        ),
      );
      setTitle("");
      setPatientId("");
      setQuickPatientName("");
      setQuickPatientBirthDate("");
      setApplicationDate("");
      setSelectedInstrumentVersionIds([]);
      setReportFormOpen(false);
      setMessage("Avaliação criada.");
      await load();
      await openReport(evaluation.id);
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
  async function archivePatient() {
    if (!archivePatientId) return;
    const id = archivePatientId;
    try {
      await request(`/patients/${id}`, { method: "DELETE" });
      setArchivePatientId(null);
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
    setQuickPatientName("");
    setQuickPatientBirthDate("");
    setApplicationDate("");
    setSelectedInstrumentVersionIds([]);
    setReportFormOpen(true);
  };
  const openReportForm = () => {
    setPatientId("");
    setTitle("");
    setQuickPatientName("");
    setQuickPatientBirthDate("");
    setApplicationDate("");
    setSelectedInstrumentVersionIds([]);
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
    setSelectedEvaluation(await request<Evaluation>(`/evaluations/${evaluation.id}`));
    setApplication({
      ...created,
      instrumentVersion: created.instrumentVersion?.formSchema
        ? created.instrumentVersion
        : {
        ...version,
        instrument: { name: instrument.name },
        },
    });
    setAnswers(created.answers ?? {});
    setSnapIvFormCount(1);
    setSnapIvFormTab(1);
    setScaredPFormCount(1);
    setScaredPFormTab(1);
    setSummary(created.professionalSummary ?? "");
    setApplicationTab("test");
    await loadReports(evaluation.id);
    setInstrumentPickerOpen(false);
    setInstrumentVersionId("");
    setActiveEditorApplicationId(created.id);
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
      setSnapIvFormCount(savedSnapIvFormCount(loaded.answers ?? {}));
      setSnapIvFormTab(1);
      setScaredPFormCount(savedScaredPFormCount(loaded.answers ?? {}));
      setScaredPFormTab(1);
      setSummary(loaded.professionalSummary ?? "");
      setApplicationTab("test");
      if (loaded.evaluation?.id) {
        const evaluation = await request<Evaluation>(
          `/evaluations/${loaded.evaluation.id}`,
        );
        setSelectedEvaluation(evaluation);
        await loadReports(evaluation.id);
      }
      setActiveEditorApplicationId(applicationId);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível abrir a aplicação.",
      );
    }
  }
  async function openReport(id: string, navigateToEditor = true) {
    try {
      const evaluation = await request<Evaluation>(`/evaluations/${id}`);
      setSelectedEvaluation(evaluation);
      setActiveEditorApplicationId(null);
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
      if (navigateToEditor) routerNavigate(`/laudos/${id}`);
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
  const updateReferralSuggestion = (index: number, value: string) => {
    const suggestions = reportContent.referral.split("\n");
    while (suggestions.length < 10) suggestions.push("");
    suggestions[index] = value;
    setReportContent({
      ...reportContent,
      referral: suggestions.join("\n").replace(/\n+$/, ""),
    });
  };
  async function saveAnswers() {
    if (!application) return;
    await request(`/evaluations/applications/${application.id}/answers`, {
      method: "PATCH",
      body: JSON.stringify({ answers }),
    });
    setMessage("Respostas salvas.");
  }
  const mergeApplicationUpdate = (updated: Partial<Application>) => {
    setApplication((current) =>
      current
        ? {
            ...current,
            ...updated,
            instrumentVersion:
              updated.instrumentVersion ?? current.instrumentVersion,
          }
        : current,
    );
  };
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
    mergeApplicationUpdate(
      await request<Partial<Application>>(
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
    mergeApplicationUpdate(
      await request<Partial<Application>>(
        `/evaluations/applications/${application.id}/review`,
        { method: "POST" },
      ),
    );
    setMessage("Resultado revisado.");
  }
  async function saveSummary() {
    if (!application) return;
    await request(`/evaluations/applications/${application.id}/summary`, {
      method: "PATCH",
      body: JSON.stringify({ summary }),
    });
    setMessage("Interpretação salva.");
  }
  async function lock() {
    if (!application) return;
    mergeApplicationUpdate(
      await request<Partial<Application>>(
        `/evaluations/applications/${application.id}/lock`,
        { method: "POST" },
      ),
    );
    setMessage("Aplicação bloqueada.");
  }
  async function reopen() {
    if (!application) return;
    mergeApplicationUpdate(
      await request<Partial<Application>>(
        `/evaluations/applications/${application.id}/reopen`,
        { method: "POST" },
      ),
    );
    setApplicationTab("test");
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
  const openReportExport = (destination: "pdf" | "googleDocs") => {
    if (!selectedEvaluation) return;
    setReportExportDestination(destination);
    setReportExportSettings({
      chapters: {
        coverPage: false,
        identification: true,
        demand: true,
        procedures: true,
        anamnesis: true,
        conclusion: true,
        referral: true,
        references: true,
        deliveryTerm: true,
      },
      tests: Object.fromEntries(
        (selectedEvaluation.applications ?? []).map((application) => [
          application.id,
          { table: true, chart: true },
        ]),
      ),
    });
    setReportExportOpen(true);
  };
  const reportExportMenu = () => <ReportExportMenu onSelect={openReportExport} />;
  async function generateReport(destination: "pdf" | "googleDocs") {
    if (!selectedEvaluation) return;
    const googleTab = destination === "googleDocs" ? window.open("about:blank", "_blank") : null;
    if (googleTab) {
      googleTab.opener = null;
      googleTab.document.title = "Abrindo Google Docs";
      googleTab.document.body.textContent = "Preparando o laudo no Google Docs...";
    }
    try {
      const report = await request<{ id: string }>(
        `/reports/evaluations/${selectedEvaluation.id}`,
        { method: "POST", body: JSON.stringify(reportExportSettings) },
      );
      await loadReports(selectedEvaluation.id);
      if (destination === "pdf") {
        await previewReport(report.id);
        setReportExportOpen(false);
        setMessage("PDF gerado e aberto para visualização.");
        return;
      }
      const { authorizationUrl } = await request<{ authorizationUrl: string }>(
        `/reports/${report.id}/google-docs`,
        { method: "POST" },
      );
      setReportExportOpen(false);
      if (googleTab) googleTab.location.href = authorizationUrl;
      else window.open(authorizationUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      googleTab?.close();
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível exportar o laudo.",
      );
    }
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
      editor: "/laudos",
      results: "/resultados",
      platformTests: "/testes-da-plataforma",
      platformTest: "/testes-da-plataforma",
      profile: "/perfil",
      settings: "/configuracoes",
    };
    setMobileMenu(false);
    routerNavigate(routes[nextView]);
  };
  const selectReportChapter = (chapter: typeof reportChapter) => {
    setActiveEditorApplicationId(null);
    setReportChapter(chapter);
    if (view === "results" && selectedEvaluation) {
      void openReport(selectedEvaluation.id).then(() => setReportChapter(chapter));
    }
  };
  const snapIvAvailableFormCount = Math.max(
    1,
    ...(application?.instrumentVersion.formSchema.sections ?? [])
      .map((section) => section.id.match(/^snap_iv_form_(\d+)_/)?.[1])
      .filter((formNumber): formNumber is string => Boolean(formNumber))
      .map(Number),
  );
  const scaredPAvailableFormCount = Math.max(
    1,
    ...(application?.instrumentVersion.formSchema.sections ?? [])
      .map((section) => section.id.match(/^scared_p_form_(\d+)_/)?.[1])
      .filter((formNumber): formNumber is string => Boolean(formNumber))
      .map(Number),
  );
  const hasTabbedScaredP = application?.instrumentVersion.instrument.name === "SCARED-P" &&
    application.instrumentVersion.formSchema.sections.some((section) => section.id.startsWith("scared_p_form_"));
  const scaredPCurrentFormEnabled = answers[`scared_p_form_${scaredPFormTab}_enabled`] !== false;
  return (
    <main className={`dashboard-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""} ${darkMode ? "theme-dark" : ""}`}>
      <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <BrandMark size={34} />
          <div className="sidebar-label">
            <strong>{APP_NAME}</strong>
            <small>{APP_TAGLINE}</small>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Encolher menu lateral"}
            title={sidebarCollapsed ? "Expandir menu lateral" : "Encolher menu lateral"}
          >
            <SidebarIcon size={18} />
          </button>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Fechar menu lateral"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="sidebar-context">
          <span className="online-dot" />
          <span>{profile?.organization?.name ?? "Organização ativa"}</span>
          <small>Workspace clínico</small>
        </div>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {navItems.map(({ to, label, Icon, end, activeView }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={sidebarCollapsed ? label : undefined}
              className={activeView && view === activeView ? "active" : undefined}
              onClick={() => setMobileMenu(false)}
            >
              <span className="sidebar-nav-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>Ambiente local</span>
          <button className="sidebar-logout" onClick={logout}>
            <span className="sidebar-nav-icon" aria-hidden="true">
              <LogoutIcon size={18} />
            </span>
            <span>Sair</span>
          </button>
        </div>
      </aside>
      {mobileMenu && (
        <div
          className="sidebar-scrim"
          aria-hidden="true"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="dashboard-main">
        <header className="topbar" ref={topbarRef}>
          <button
            className="mobile-menu"
            onClick={() => setMobileMenu(true)}
            aria-label="Abrir menu"
          >
            <MenuIcon size={20} />
          </button>
          <div className="topbar-title">
            {view === "dashboard" ? (
              <>
                <p className="eyebrow">
                  {new Date().toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <h1>
                  {greetingFor(new Date())}
                  {profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
                </h1>
              </>
            ) : (
              <>
                <p className="eyebrow">Workspace clínico</p>
                <h1>{viewDetails[view].title}</h1>
              </>
            )}
            <p className="header-subtitle">{viewDetails[view].subtitle}</p>
          </div>
          <div className="header-actions">
            <ThemeToggle theme={theme} />
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
          <div className="snackbar" role="status" aria-live="polite">
            <span className="snackbar-icon" aria-hidden="true"><InfoIcon size={18} /></span>
            <span className="snackbar-message">{message}</span>
            <button onClick={() => setMessage("")} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        )}
        {view === "dashboard" && (
          <section className="overview-stats">
            <article>
              <span className="stat-icon orange" aria-hidden="true"><PeopleIcon size={20} /></span>
              <div>
                <strong>{patients.length}</strong>
                <span>Pacientes ativos</span>
              </div>
            </article>
            <article>
              <span className="stat-icon blue" aria-hidden="true"><DocIcon size={20} /></span>
              <div>
                <strong>{evaluations.length}</strong>
                <span>Avaliações criadas</span>
              </div>
            </article>
            <article>
              <span className="stat-icon green" aria-hidden="true"><CheckSealIcon size={20} /></span>
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
                          </tr>
                        </thead>
                        <tbody>
                          {patients.map((patient) => (
                            <tr
                              className="patient-table-row"
                              key={patient.id}
                              tabIndex={0}
                              onClick={() => openDetails(patient.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openDetails(patient.id);
                                }
                              }}
                            >
                              <td>
                                {patient.createdAt
                                  ? new Date(
                                      patient.createdAt,
                                    ).toLocaleDateString("pt-BR")
                                  : "—"}
                              </td>
                              <td>{patient.name}</td>
                              <td>{patient.phone ?? "—"}</td>
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
                    <button className="small" type="button" onClick={openReportForm}>
                      Novo laudo
                    </button>
                  </div>
                </div>
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
                          <th>Status</th>
                          <th>Data</th>
                          <th>Paciente</th>
                          <th>Laudo</th>
                          <th>Testes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluations.map((evaluation) => (
                          <tr
                            className="report-table-row"
                            key={evaluation.id}
                            tabIndex={0}
                            onClick={() => void openReport(evaluation.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                void openReport(evaluation.id);
                              }
                            }}
                          >
                            <td>
                              <span className={statusClassName(evaluation.status)}>
                                {statusLabel(evaluation.status)}
                              </span>
                            </td>
                            <td>
                              {new Date(
                                evaluation.createdAt,
                              ).toLocaleDateString("pt-BR")}
                            </td>
                            <td>{evaluation.patient.name}</td>
                            <td>{evaluation.title}</td>
                            <td>
                              {evaluation.applications?.length ? (
                                <div className="test-badges">
                                  {evaluation.applications.map((application) => (
                                    <span className="test-badge" key={application.id}>
                                      {application.instrumentVersion?.instrument.name ?? "Instrumento"}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="muted">Nenhum teste</span>
                              )}
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
                          <span className={statusClassName(evaluation.status)}>{statusLabel(evaluation.status)}</span>
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
        {view === "platformTests" && (
          <section className="platform-tests-page">
            <div className="platform-tests-heading">
              <div>
                <span className="section-kicker">Catálogo clínico</span>
                <h2>Testes da Plataforma</h2>
                <p>
                  Consulte os instrumentos disponíveis, suas características e
                  critérios de utilização.
                </p>
              </div>
              <span className="platform-tests-count">
                {platformInstruments.length + 4} teste{platformInstruments.length + 4 === 1 ? "" : "s"}
              </span>
            </div>
            <div className="platform-tests-grid">
              <SnapIvCard onOpen={() => routerNavigate("/testes-da-plataforma/snap-iv")} />
              <ScaredCCard onOpen={() => routerNavigate("/testes-da-plataforma/scared-c")} />
              <ScaredPCard onOpen={() => routerNavigate("/testes-da-plataforma/scared-p")} />
              <BaiCard onOpen={() => routerNavigate("/testes-da-plataforma/bai")} />
              {platformInstruments.map((instrument) => {
                const metadata = instrument.versions[0]?.sourceMetadata?.platform;
                if (!metadata) return null;
                return (
                  <article className="platform-test-card" key={instrument.id}>
                    <div className="platform-test-card-top">
                      <span className="platform-test-icon">AS</span>
                      <span className="platform-test-category">{instrument.category}</span>
                    </div>
                    <h3>{instrument.name}</h3>
                    <p>{metadata.subtitle}</p>
                    <div className="platform-test-tags">
                      <span>{metadata.audience}</span>
                      <span>{metadata.itemCount} itens</span>
                      <span>{metadata.format}</span>
                    </div>
                    <div className="platform-test-card-footer">
                      <span>{metadata.purpose}</span>
                      <button
                        className="secondary small"
                        onClick={() => routerNavigate(`/testes-da-plataforma/${instrument.code.toLowerCase()}`)}
                      >
                        Ver teste
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {view === "platformTest" && platformTestCode === "SNAP-IV" && (
          <SnapIvPage onBack={() => navigate("platformTests")} />
        )}
        {view === "platformTest" && platformTestCode === "SCARED-C" && (
          <ScaredCPage onBack={() => navigate("platformTests")} />
        )}
        {view === "platformTest" && platformTestCode === "SCARED-P" && (
          <ScaredPPage onBack={() => navigate("platformTests")} />
        )}
        {view === "platformTest" && platformTestCode === "BAI" && (
          <BaiPage onBack={() => navigate("platformTests")} />
        )}
        {view === "platformTest" && selectedPlatformInstrument && selectedPlatformMetadata && (
          <section className="platform-test-page">
            <button className="back-link" onClick={() => navigate("platformTests")}>
              Voltar para testes da plataforma
            </button>
            <article className="panel platform-test-hero">
              <div className="platform-test-hero-mark">AS</div>
              <div>
                <span className="section-kicker">{selectedPlatformInstrument.category}</span>
                <h2>{selectedPlatformInstrument.name}</h2>
                <p>{selectedPlatformMetadata.subtitle}</p>
              </div>
              <span className="platform-use-badge">{selectedPlatformMetadata.professionalUse}</span>
            </article>
            <div className="platform-test-layout">
              <article className="panel platform-test-main">
                <span className="section-kicker">Sobre o ASRS-18</span>
                <h2>Conheça as características, a aplicação e os critérios utilizados pela plataforma.</h2>
                <h3>O que é o ASRS-18?</h3>
                <p>O ASRS-18 é uma escala de autorrelato criada pelo grupo da Organização Mundial da Saúde para rastrear manifestações de TDAH em adultos.</p>
                <p>Seus 18 itens correspondem aos grupos de desatenção e hiperatividade/impulsividade e consideram os seis meses anteriores. A Parte A reúne seis itens com melhor desempenho de rastreio; a Parte B amplia a descrição clínica.</p>
                <p>O resultado indica sinais que merecem investigação. Não confirma ou exclui TDAH sem entrevista, história desde a infância, prejuízo funcional, presença em diferentes contextos e avaliação de explicações alternativas.</p>
                <div className="platform-domain-list">
                  {selectedPlatformMetadata.domains.map((domain) => <span key={domain}>{domain}</span>)}
                </div>
                <h3>Como o instrumento funciona</h3>
                <ol className="platform-steps">
                  <li><strong>Parte A — 6 itens</strong><span>Núcleo breve de rastreamento, corrigido com limiares específicos por item.</span></li>
                  <li><strong>Parte B — 12 itens</strong><span>Complementa a entrevista sobre variedade e frequência das manifestações.</span></li>
                  <li><strong>Últimos seis meses</strong><span>O respondente informa com que frequência vivenciou cada situação.</span></li>
                </ol>
                <h3>Para que serve</h3>
                <p>Identificar a frequência de sintomas relacionados ao TDAH e apoiar a decisão de realizar uma avaliação clínica mais aprofundada.</p>
                <h3>O que ajuda a observar</h3>
                <div className="platform-observation-grid">
                  <div><strong>Desatenção</strong><span>Foco, organização, conclusão de tarefas e esquecimento.</span></div>
                  <div><strong>Hiperatividade</strong><span>Inquietação e dificuldade de permanecer parado ou desacelerar.</span></div>
                  <div><strong>Impulsividade</strong><span>Interrupção, precipitação e controle de respostas.</span></div>
                </div>
                <h3>Onde pode ser utilizado</h3>
                <div className="platform-observation-grid">
                  <div><strong>Triagem clínica</strong><span>Identificação de adultos que precisam de avaliação ampliada.</span></div>
                  <div><strong>Entrevista</strong><span>Pontos de partida para coletar exemplos concretos.</span></div>
                  <div><strong>Avaliação neuropsicológica</strong><span>Uma fonte dentro de um processo multimétodo.</span></div>
                </div>
                <h3>O que investigar além do resultado</h3>
                <ul className="platform-checklist">
                  <li>Há evidências de sintomas antes dos 12 anos?</li>
                  <li>Existe prejuízo em trabalho, estudos, casa ou relações?</li>
                  <li>Os sinais aparecem em mais de um contexto?</li>
                  <li>Sono, ansiedade, depressão, substâncias ou condições médicas oferecem explicações alternativas?</li>
                </ul>
                <h3>Como a plataforma utiliza este teste</h3>
                <p>A plataforma organiza as respostas dos 18 itens e aplica os critérios configurados para a versão brasileira, destacando o núcleo de rastreio e os domínios de desatenção e hiperatividade/impulsividade.</p>
                <p>A correção informatizada apoia o registro e o laudo, mas a conclusão precisa ser conferida com a fonte técnica e integrada a dados clínicos e funcionais.</p>
                <h3>Importante sobre a interpretação</h3>
                <p>Os resultados não devem ser interpretados isoladamente. A conclusão profissional precisa integrar entrevista, observação, histórico, contexto da avaliação e outras fontes pertinentes, respeitando o manual e o escopo do instrumento.</p>
              </article>
              <aside className="platform-test-aside">
                <article className="panel">
                  <span className="section-kicker">Resumo do instrumento</span>
                  <dl className="platform-summary">
                    <div><dt>Itens</dt><dd>{selectedPlatformMetadata.itemCount}</dd></div>
                    <div><dt>Público</dt><dd>{selectedPlatformMetadata.audience}</dd></div>
                    <div><dt>Formato</dt><dd>{selectedPlatformMetadata.format}</dd></div>
                    <div><dt>Finalidade</dt><dd>{selectedPlatformMetadata.purpose}</dd></div>
                    <div><dt>Domínios</dt><dd>{selectedPlatformMetadata.domains.length}</dd></div>
                    <div><dt>Autores</dt><dd>{selectedPlatformMetadata.authors}</dd></div>
                    <div><dt>Uso profissional</dt><dd>{selectedPlatformMetadata.professionalUse}</dd></div>
                  </dl>
                </article>
                <article className="panel platform-reference-card">
                  <span className="section-kicker">Referências bibliográficas</span>
                  <a href="https://doi.org/10.1017/S0033291704002892" target="_blank" rel="noreferrer">Kessler, R. C. et al. The World Health Organization Adult ADHD Self-Report Scale (ASRS). Psychological Medicine, 2005.</a>
                  <a href="https://www.hcp.med.harvard.edu/ncs/asrs.php" target="_blank" rel="noreferrer">Harvard Medical School · ASRS Scales and Checklists</a>
                  <a href="https://www.scielo.br/j/rpc/a/nnhNLNxkFSmQwVBSGZYdp6d/?format=html&amp;lang=pt" target="_blank" rel="noreferrer">Mattos, P. et al. Adaptação transcultural da ASRS para o português. Revista de Psiquiatria Clínica, 2006.</a>
                </article>
              </aside>
            </div>
          </section>
        )}
        {view === "platformTest" && !["SNAP-IV", "SCARED-C", "SCARED-P", "BAI"].includes(platformTestCode ?? "") && !selectedPlatformInstrument && !loading && (
          <section className="panel empty-view">
            <h2>Teste não encontrado</h2>
            <button onClick={() => navigate("platformTests")}>Ver testes da plataforma</button>
          </section>
        )}
        {(view === "editor" || view === "results") && selectedEvaluation && (
          <>
            <button className="back-link report-editor-back" onClick={() => navigate("reports")}>
              Voltar para laudos
            </button>
            <section className="report-editor">
            <aside className="report-outline">
              <span className="section-kicker">Capítulos</span>
              <button
                className={!activeEditorApplicationId && view !== "results" && reportChapter === "identification" ? "active" : ""}
                onClick={() => selectReportChapter("identification")}
              >
                Identificação
              </button>
              <button
                className={!activeEditorApplicationId && view !== "results" && reportChapter === "demand" ? "active" : ""}
                onClick={() => selectReportChapter("demand")}
              >
                Descrição da demanda
              </button>
              <button
                className={!activeEditorApplicationId && view !== "results" && reportChapter === "anamnesis" ? "active" : ""}
                onClick={() => selectReportChapter("anamnesis")}
              >
                Anamnese
              </button>
              <button
                className={!activeEditorApplicationId && view !== "results" && reportChapter === "conclusion" ? "active" : ""}
                onClick={() => selectReportChapter("conclusion")}
              >
                Conclusão
              </button>
              <button
                className={!activeEditorApplicationId && view !== "results" && reportChapter === "referral" ? "active" : ""}
                onClick={() => selectReportChapter("referral")}
              >
                Encaminhamento
              </button>
              <div className="report-outline-tests">
                <span className="section-kicker">Testes</span>
                {selectedEvaluation.applications?.map((item) => (
                  <button
                    className={`outline-application ${activeEditorApplicationId === item.id ? "active" : ""}`}
                    key={item.id}
                    onClick={() => void openApplication(item.id)}
                  >
                    <span>
                      {item.instrumentVersion?.instrument.name ?? "Instrumento"}
                    </span>
                      <small>{statusLabel(item.status)}</small>
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
            {!activeEditorApplicationId && view !== "results" && (
            <div className="panel report-editor-content">
              <div className="report-editor-heading">
                <div>
                  <span className="section-kicker">
                    {statusLabel(selectedEvaluation.status)}
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
                    reportExportMenu()
                  )}
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
                  <h3>Sugestões de encaminhamento</h3>
                  <div className="referral-suggestions">
                    {Array.from({ length: 10 }, (_, index) => (
                      <input
                        key={index}
                        value={reportContent.referral.split("\n")[index] ?? ""}
                        onChange={(event) =>
                          updateReferralSuggestion(index, event.target.value)
                        }
                        placeholder="Escreva a sugestão que você quer que apareça no laudo."
                      />
                    ))}
                  </div>
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
            )}
            {application && application.instrumentVersion?.instrument &&
              application.id === activeEditorApplicationId && (
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
              <span className={statusClassName(application.status)}>{statusLabel(application.status)}</span>
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
                {application.instrumentVersion.instrument.name === "SNAP-IV" && application.instrumentVersion.formSchema.sections.some((section) => section.id.startsWith("snap_iv_form_")) && (
                  <div className="tab-list snapiv-form-tabs" role="tablist" aria-label="Formulários SNAP-IV">
                    {Array.from({ length: snapIvFormCount }, (_, index) => index + 1).map((formNumber) => (
                      <button
                        className={snapIvFormTab === formNumber ? "active" : ""}
                        key={formNumber}
                        type="button"
                        role="tab"
                        aria-selected={snapIvFormTab === formNumber}
                        onClick={() => setSnapIvFormTab(formNumber)}
                      >
                        Formulário {formNumber}
                      </button>
                    ))}
                    {snapIvFormCount < snapIvAvailableFormCount && (
                      <button
                        type="button"
                        aria-label="Adicionar formulário SNAP-IV"
                        onClick={() => {
                          const nextForm = snapIvFormCount + 1;
                          setSnapIvFormCount(nextForm);
                          setSnapIvFormTab(nextForm);
                          setAnswers((current) => ({
                            ...current,
                            [`snap_iv_form_${nextForm}_enabled`]: true,
                          }));
                        }}
                      >
                        + Adicionar formulário
                      </button>
                    )}
                  </div>
                )}
                {hasTabbedScaredP && (
                  <>
                  <div className="tab-list snapiv-form-tabs scared-form-tabs" role="tablist" aria-label="Formulários SCARED-P">
                    {Array.from({ length: scaredPFormCount }, (_, index) => index + 1).map((formNumber) => (
                      <button
                        className={scaredPFormTab === formNumber ? "active" : ""}
                        key={formNumber}
                        type="button"
                        role="tab"
                        aria-selected={scaredPFormTab === formNumber}
                        onClick={() => setScaredPFormTab(formNumber)}
                      >
                        Formulário {formNumber}
                      </button>
                    ))}
                    {canEdit && scaredPFormCount < scaredPAvailableFormCount && (
                      <button
                        type="button"
                        aria-label="Adicionar formulário SCARED-P"
                        onClick={() => {
                          const nextForm = scaredPFormCount + 1;
                          setScaredPFormCount(nextForm);
                          setScaredPFormTab(nextForm);
                          setAnswers((current) => ({ ...current, [`scared_p_form_${nextForm}_enabled`]: true }));
                        }}
                      >
                        + Adicionar formulário
                      </button>
                    )}
                    {canEdit && (
                      <button
                        className="scared-clear-form"
                        type="button"
                        onClick={() => setAnswers((current) => Object.fromEntries(Object.entries(current).filter(([fieldId]) => !fieldId.startsWith(`scared_p_form_${scaredPFormTab}_`) || fieldId.endsWith("_enabled"))))}
                      >
                        Limpar formulário
                      </button>
                    )}
                  </div>
                  <div className="scared-form-controls" role="group" aria-label="Preencher questões do formulário">
                    <span>Preencher questões:</span>
                    <button className={scaredPCurrentFormEnabled ? "active" : ""} type="button" disabled={!canEdit} onClick={() => setAnswers((current) => ({ ...current, [`scared_p_form_${scaredPFormTab}_enabled`]: true }))}>Sim</button>
                    <button className={!scaredPCurrentFormEnabled ? "active" : ""} type="button" disabled={!canEdit} onClick={() => setAnswers((current) => ({
                      ...Object.fromEntries(Object.entries(current).filter(([fieldId]) => !fieldId.startsWith(`scared_p_form_${scaredPFormTab}_item_`))),
                      [`scared_p_form_${scaredPFormTab}_enabled`]: false,
                    }))}>Não</button>
                  </div>
                  </>
                )}
                {application.instrumentVersion.instrument.code === "BAI" && (
                  <p className="notice">A plataforma calcula somente o escore bruto total. Domínios, normas, classificação e inclusão no laudo permanecem indisponíveis até validação técnica e profissional.</p>
                )}
                <div className={`form-sections ${application.instrumentVersion.instrument.name === "ASRS-18" ? "asrs-form-sections" : application.instrumentVersion.instrument.code === "BAI" || application.instrumentVersion.instrument.name === "SNAP-IV" ? "snapiv-form-sections" : ["SCARED-C", "SCARED-P"].includes(application.instrumentVersion.instrument.name) ? "scared-form-sections" : ""}`}>
                  {application.instrumentVersion.formSchema.sections.map(
                    (section) => (
                      (application.instrumentVersion.instrument.name !== "SNAP-IV" || !application.instrumentVersion.formSchema.sections.some((item) => item.id.startsWith("snap_iv_form_")) || section.id.startsWith(`snap_iv_form_${snapIvFormTab}_`)) &&
                      (!hasTabbedScaredP || (section.id.startsWith(`scared_p_form_${scaredPFormTab}_`) && (scaredPCurrentFormEnabled || !section.id.endsWith("_questions")))) && (
                      <div
                        key={section.id}
                        className={section.id.includes("_respondent_section") ? "snapiv-respondent-section" : section.id === "parent_report_respondent" ? "scared-respondent-section" : undefined}
                      >
                        <h3>{section.title}</h3>
                        {(section.fields[0]?.id.startsWith("asrs_") || /^snap_iv_(?:form_\d+_item_\d+|\d+)$/.test(section.fields[0]?.id ?? "") || section.fields[0]?.id.startsWith("bai_") || /^scared_(?:c_\d+|p_(?:form_\d+_item_\d+|\d+))$/.test(section.fields[0]?.id ?? "")) && (
                          <div className={/^scared_(?:c_\d+|p_(?:form_\d+_item_\d+|\d+))$/.test(section.fields[0]?.id ?? "") ? "scared-choice-header" : section.fields[0]?.id.startsWith("snap_iv_") || section.fields[0]?.id.startsWith("bai_") ? "snapiv-choice-header" : "asrs-choice-header"} aria-hidden="true">
                            <span>Questões</span>
                            {section.fields[0].options?.map((option) => (
                              <span key={option.value}>{option.label}</span>
                            ))}
                          </div>
                        )}
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
                      )
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
                        {application.instrumentVersion.instrument.code === "BAI" ? "Calcular escore bruto" : "Calcular resultado"}
                      </button>
                    </>
                  )}
                  {application.status === "CALCULATED" && application.instrumentVersion.sourceMetadata?.features?.review !== false && (
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
                      {reportExportMenu()}
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
                  {application.instrumentVersion.instrument.name === "SNAP-IV" ? (
                    <SnapIvResults
                      result={application.result}
                      answers={answers}
                      summary={summary}
                      disabled={application.status === "LOCKED"}
                      onSummaryChange={setSummary}
                      onSave={() => void saveSummary()}
                    />
                  ) : hasTabbedScaredP ? (
                    <ScaredPResults
                      result={application.result}
                      summary={summary}
                      disabled={application.status === "LOCKED"}
                      onSummaryChange={setSummary}
                      onSave={() => void saveSummary()}
                    />
                  ) : application.instrumentVersion.instrument.code === "BAI" ? (
                    <>
                      <div className="result result-table-wrap">
                        <table className="result-table">
                          <thead><tr><th>Pontuação total</th><th>Itens respondidos</th><th>Classificação</th></tr></thead>
                          <tbody><tr><td>{String(application.result.bai_total_raw ?? "—")} / 63</td><td>{String(application.result.bai_answered_items ?? "—")} / 21</td><td>Não disponível para esta versão</td></tr></tbody>
                        </table>
                      </div>
                      <p>Este é apenas o somatório bruto das respostas. Não há classificação, interpretação por domínios ou conclusão clínica automatizada.</p>
                    </>
                  ) : ["SCARED-C", "SCARED-P"].includes(application.instrumentVersion.instrument.name) ? (
                    <>
                      {application.instrumentVersion.instrument.name === "SCARED-P" && (
                        <p>Respondente: {{ mother: "Mãe", father: "Pai", caregiver: "Cuidador(a)" }[String(application.result.scared_p_respondent ?? "")] ?? String(application.result.scared_p_respondent ?? "—")}</p>
                      )}
                      <div className="result result-table-wrap">
                        <table className="result-table">
                          <thead><tr><th>Indicador</th><th>Pontuação</th><th>Rastreamento</th></tr></thead>
                          <tbody>
                            {[
                              ["Total", "total", 82, 25],
                              ["Pânico/somático", "panic_somatic", 26, 7],
                              ["Ansiedade generalizada", "generalized_anxiety", 18, 9],
                              ["Separação", "separation_anxiety", 16, 5],
                              ["Ansiedade social", "social_anxiety", 14, 8],
                              ["Evitação escolar", "school_avoidance", 8, 3],
                            ].map(([label, domain, maximum, cutoff]) => (
                              <tr key={String(domain)}>
                                <td>{label}</td>
                                <td>{String(application.result?.[`${application.instrumentVersion.instrument.name === "SCARED-P" ? "scared_p" : "scared_c"}_${domain}${domain === "total" ? "" : "_score"}`] ?? "—")} / {maximum}</td>
                                <td>{String(application.result?.[`${application.instrumentVersion.instrument.name === "SCARED-P" ? "scared_p" : "scared_c"}_${domain}_screen`] ?? "—")} (≥ {cutoff})</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p>Pontos de atenção da ficha original. Resultados de rastreamento não estabelecem diagnóstico; a tradução dos itens deve ser conferida com a versão adotada.</p>
                      <label>Revise o resultado e escreva sua síntese
                        <textarea disabled={application.status === "LOCKED"} value={summary} onChange={(event) => setSummary(event.target.value)} rows={5} />
                      </label>
                      <button className="secondary" disabled={application.status === "LOCKED"} onClick={() => void saveSummary()}>Salvar síntese</button>
                    </>
                  ) : application.instrumentVersion.instrument.name === "ASRS-18" ? (
                    <>
                      <div className="asrs-result-view-toggle" role="group" aria-label="Visualização dos resultados">
                        <button
                          className={asrsResultView === "table" ? "active" : ""}
                          type="button"
                          onClick={() => setAsrsResultView("table")}
                        >
                          ☷ Tabela
                        </button>
                        <button
                          className={asrsResultView === "chart" ? "active" : ""}
                          type="button"
                          onClick={() => setAsrsResultView("chart")}
                        >
                          ▦ Gráfico
                        </button>
                      </div>
                      {asrsResultView === "table" ? (
                        <div className="result result-table-wrap">
                          <table className="result-table">
                            <thead><tr><th>Domínios</th><th>Pontuação</th><th>Classificação</th></tr></thead>
                            <tbody>
                              <tr><td>Parte A (Desatenção)</td><td>{String(application.result.inattention_symptom_count ?? "—")}</td><td>{String(application.result.inattention_classification ?? "—")}</td></tr>
                              <tr><td>Parte B (Hiperatividade/Impulsividade)</td><td>{String(application.result.hyperactivity_impulsivity_symptom_count ?? "—")}</td><td>{String(application.result.hyperactivity_impulsivity_classification ?? "—")}</td></tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="asrs-chart" role="img" aria-label="Gráfico das pontuações dos domínios do ASRS-18">
                          <div className="asrs-chart-heading">
                            <strong>ASRS-18</strong>
                            <span>Faixa esperada: 0 a 4</span>
                          </div>
                          <div className="asrs-chart-plot">
                            <div className="asrs-chart-scale" aria-hidden="true">
                              {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((value) => <span key={value}>{value}</span>)}
                            </div>
                            <div className="asrs-chart-bars">
                              {[
                                ["Parte A (Desatenção)", Number(application.result.inattention_symptom_count ?? 0)],
                                ["Parte B (Hiperatividade/Impulsividade)", Number(application.result.hyperactivity_impulsivity_symptom_count ?? 0)],
                              ].map(([label, score]) => (
                                <div className="asrs-chart-bar-group" key={String(label)}>
                                  <span className="asrs-chart-score">{String(score)}</span>
                                  <div className="asrs-chart-bar-track">
                                    <span className="asrs-chart-bar" style={{ height: `${Math.max(0, Math.min(Number(score), 9)) / 9 * 100}%` }} />
                                  </div>
                                  <strong>{String(label)}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="asrs-result-interpretation">
                        <h3>Interpretação dos resultados</h3>
                        <label>
                          Revise o resultado e escreva sua síntese
                          <textarea
                            disabled={application.status === "LOCKED"}
                            value={summary}
                            onChange={(event) => setSummary(event.target.value)}
                            rows={5}
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
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
                          <thead><tr><th>Indicador</th><th>Resultado</th></tr></thead>
                          <tbody>{Object.entries(application.result).map(([key, value]) => (
                            <tr key={key}><td>{key.replaceAll("_", " ")}</td><td>{typeof value === "object" ? JSON.stringify(value) : String(value)}</td></tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </>
                  )}
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
                  <dd>{statusLabel(application.status)}</dd>
                </div>
                <div>
                  <dt>Aplicação</dt>
                  <dd>{application.id}</dd>
                </div>
              </dl>
            )}
            </section>
            )}
            </section>
          </>
        )}
        {view === "editor" && !selectedEvaluation && (
          <section className="panel empty-view">
            <span className="section-kicker">Nenhum laudo selecionado</span>
            <h2>Abra um laudo para começar a editar</h2>
            <button onClick={() => navigate("reports")}>Ir para laudos</button>
          </section>
        )}
        {view === "results" && (!application || !application.instrumentVersion?.instrument) && (
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
          <div className="settings-page">
            <section className="panel settings-appearance">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Personalização</span>
                  <h2>Aparência</h2>
                  <p className="muted">
                    Escolha entre o modo claro e o escuro. A preferência fica
                    salva neste navegador.
                  </p>
                </div>
              </div>
              <AppearanceControls theme={theme} />
            </section>
            <section className="panel empty-view">
              <span className="section-kicker">Em preparação</span>
              <h2>Configurações da organização</h2>
              <p className="muted">
                Esta área receberá os dados institucionais, a identidade do
                documento e as permissões de acesso nas próximas fases.
              </p>
            </section>
          </div>
        )}
        {archivePatientId && (
          <div className="modal-backdrop" onClick={() => setArchivePatientId(null)}>
            <section
              className="modal-card archive-patient-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="archive-patient-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button className="modal-close" type="button" aria-label="Fechar confirmação" onClick={() => setArchivePatientId(null)}>×</button>
              <span className="section-kicker">Confirmar ação</span>
              <h2 id="archive-patient-title">Arquivar paciente?</h2>
              <p className="muted">O histórico será preservado, mas o cadastro deixará de aparecer nas listas de pacientes ativos.</p>
              <div className="archive-patient-actions">
                <button className="secondary" type="button" onClick={() => setArchivePatientId(null)}>Cancelar</button>
                <button className="danger" type="button" onClick={() => void archivePatient()}>Arquivar paciente</button>
              </div>
            </section>
          </div>
        )}
        {instrumentPickerOpen && selectedEvaluation && (
          <div
            className="modal-backdrop"
            onClick={() => setInstrumentPickerOpen(false)}
          >
            <form
              className="modal-card report-create-modal"
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
                    instrument.versions
                      .filter(
                        (version) =>
                          version.sourceMetadata?.platform?.applicationEnabled !== false,
                      )
                      .map((version) => (
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
        {reportExportOpen && selectedEvaluation && (
          <div className="modal-backdrop" onClick={() => setReportExportOpen(false)}>
            <form
              className="modal-card report-export-modal"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => {
                event.preventDefault();
                void generateReport(reportExportDestination);
              }}
            >
              <button className="modal-close" type="button" onClick={() => setReportExportOpen(false)}>×</button>
              <h2>Configuração do Laudo</h2>
              {reportExportDestination === "googleDocs" && (
                <p className="muted">
                  Ao concluir, você será direcionado para autorizar e abrir o documento no Google Docs.
                </p>
              )}
              <div className="report-export-grid">
                <section>
                  <h3>Configuração dos Capítulos</h3>
                  <p>Indique quais seções devem ser incluídas no seu laudo.</p>
                  <div className="report-export-options">
                    {[
                      ["coverPage", "Folha rosto"],
                      ["identification", "Identificação"],
                      ["demand", "Descrição da demanda"],
                      ["procedures", "Procedimentos"],
                      ["anamnesis", "Anamnese"],
                      ["conclusion", "Conclusão"],
                      ["referral", "Encaminhamento"],
                      ["references", "Referências bibliográficas"],
                      ["deliveryTerm", "Termo de entrega"],
                    ].map(([key, label]) => (
                      <div className="report-export-option" key={key}>
                        <strong>{label}</strong>
                        <label><input type="radio" name={key} checked={reportExportSettings.chapters[key]} onChange={() => setReportExportSettings({ ...reportExportSettings, chapters: { ...reportExportSettings.chapters, [key]: true } })} /> Sim</label>
                        <label><input type="radio" name={key} checked={!reportExportSettings.chapters[key]} onChange={() => setReportExportSettings({ ...reportExportSettings, chapters: { ...reportExportSettings.chapters, [key]: false } })} /> Não</label>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="report-export-tests">
                  <h3>Configuração dos Testes</h3>
                  <p>Selecione quais ilustrações gráficas devem ser geradas no laudo para cada teste.</p>
                  <div className="report-export-options">
                    {(selectedEvaluation.applications ?? []).filter((application) => application.status === "LOCKED").map((application) => (
                      <div className="report-export-option report-export-test-option" key={application.id}>
                        <strong>{application.instrumentVersion?.instrument.name ?? "Instrumento"}</strong>
                        <label><input type="checkbox" checked={reportExportSettings.tests[application.id]?.table ?? true} onChange={(event) => setReportExportSettings({ ...reportExportSettings, tests: { ...reportExportSettings.tests, [application.id]: { ...reportExportSettings.tests[application.id], table: event.target.checked } } })} /> Tabela</label>
                        <label><input type="checkbox" checked={reportExportSettings.tests[application.id]?.chart ?? true} onChange={(event) => setReportExportSettings({ ...reportExportSettings, tests: { ...reportExportSettings.tests, [application.id]: { ...reportExportSettings.tests[application.id], chart: event.target.checked } } })} /> Gráfico</label>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="report-export-actions">
                <button className="secondary" type="button" onClick={() => setReportExportOpen(false)}>Fechar</button>
                <button type="submit">⇩ Exportar {reportExportDestination === "pdf" ? "PDF" : "Google Docs"}</button>
              </div>
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
              <h2>Novo Laudo</h2>
              <label>
                Selecione um Paciente já Cadastrado
                <select
                  value={patientId}
                  onChange={(event) => {
                    setPatientId(event.target.value);
                    if (event.target.value) {
                      setQuickPatientName("");
                      setQuickPatientBirthDate("");
                    }
                  }}
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
              <div className="report-create-divider"><span>ou</span></div>
              <div className="form-grid report-create-fields">
              <label className="form-grid-wide">
                <span><b>*</b> Nome do paciente</span>
                <input
                  value={quickPatientName}
                  onChange={(event) => {
                    setQuickPatientName(event.target.value);
                    if (event.target.value) setPatientId("");
                  }}
                  placeholder="Insira um nome para o paciente"
                  disabled={Boolean(patientId)}
                />
              </label>
              <label>
                <span><b>*</b> Data de nascimento</span>
                <input
                  type="date"
                  value={quickPatientBirthDate}
                  onChange={(event) => {
                    setQuickPatientBirthDate(event.target.value);
                    if (event.target.value) setPatientId("");
                  }}
                  disabled={Boolean(patientId)}
                />
              </label>
              <label>
                <span><b>*</b> Data de aplicação do teste</span>
                <input
                  type="date"
                  value={applicationDate}
                  onChange={(event) => setApplicationDate(event.target.value)}
                  required
                />
              </label>
              </div>
              <label>
                Testes incluídos no laudo
                <select
                  multiple
                  size={Math.min(Math.max(availableInstrumentVersions.length, 1), 4)}
                  value={selectedInstrumentVersionIds}
                  onChange={(event) =>
                    setSelectedInstrumentVersionIds(
                      Array.from(event.target.selectedOptions, (option) => option.value),
                    )
                  }
                >
                  {availableInstrumentVersions.length === 0 ? (
                    <option disabled>Nenhum teste disponível</option>
                  ) : (
                    availableInstrumentVersions.map((instrument) => (
                      <option
                        key={instrument.id}
                        value={instrument.id}
                        disabled={!instrument.enabled}
                      >
                        {instrument.label}{instrument.enabled ? "" : " — em configuração"}
                      </option>
                    ))
                  )}
                </select>
                <small className="field-help">Use Ctrl ou Cmd para selecionar mais de um teste.</small>
              </label>
              <div className="report-create-actions">
                <button className="secondary" type="button" onClick={() => setReportFormOpen(false)}>Cancelar</button>
                <button type="submit">OK</button>
              </div>
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
                className={isPatientEditPage ? "back-link" : "modal-close"}
                type="button"
                aria-label={isPatientEditPage ? "Voltar para o paciente" : "Fechar cadastro"}
                onClick={() => {
                  setPatientFormOpen(false);
                  if (isPatientEditPage && editingPatientId)
                    routerNavigate(`/pacientes/${editingPatientId}`);
                }}
              >
                {isPatientEditPage ? "Voltar para o paciente" : "×"}
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
              className="back-link"
              type="button"
              onClick={() => navigate("patients")}
            >
              Voltar para pacientes
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
                    className="small patient-action-primary"
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
                    onClick={() => setArchivePatientId(details.id)}
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
                        <span className={statusClassName(item.status)}>{statusLabel(item.status)}</span>
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
      <nav className="ios-tabbar" aria-label="Navegação rápida">
        {navItems
          .filter((item) => item.inTabBar)
          .map(({ to, shortLabel, Icon, end, activeView }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={activeView && view === activeView ? "active" : undefined}
            >
              <Icon size={23} />
              <span>{shortLabel}</span>
            </NavLink>
          ))}
      </nav>
    </main>
  );
}

function App() {
  const theme = useThemePreferences();
  const [authenticated, setAuthenticated] = useState(
    Boolean(localStorage.getItem("laudo_token")),
  );
  useEffect(() => {
    const expire = () => setAuthenticated(false);
    window.addEventListener("laudo-session-expired", expire);
    return () => window.removeEventListener("laudo-session-expired", expire);
  }, []);
  return authenticated ? (
    <Dashboard theme={theme} onLogout={() => setAuthenticated(false)} />
  ) : (
    <Login onLogin={() => setAuthenticated(true)} />
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
