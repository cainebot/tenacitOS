"use client";

import { BRANDING } from "@/config/branding";

interface Workflow {
  id: string;
  emoji: string;
  name: string;
  description: string;
  schedule: string;
  steps: string[];
  status: "active" | "inactive";
  trigger: "cron" | "demand";
}

const WORKFLOWS: Workflow[] = [
  {
    id: "social-radar",
    emoji: "🔭",
    name: "Social Radar",
    description: "Monitoriza menciones, oportunidades de colaboración y conversaciones relevantes en redes sociales y foros.",
    schedule: "9:30h y 17:30h (cada día)",
    trigger: "cron",
    status: "active",
    steps: [
      `Busca menciones de ${BRANDING.twitterHandle} en Twitter/X, LinkedIn e Instagram`,
      "Revisa hilos de Reddit en r/webdev, r/javascript, r/learnprogramming",
      `Detecta oportunidades de colaboración y collabs entrantes (${BRANDING.ownerCollabEmail})`,
      "Monitoriza aprendiendo.dev en conversaciones y menciones",
      "Envía resumen por Telegram si hay algo relevante",
    ],
  },
  {
    id: "noticias-ia",
    emoji: "📰",
    name: "Noticias IA y Web",
    description: "Resume las noticias más relevantes de IA y desarrollo web del timeline de Twitter para arrancar el día informado.",
    schedule: "7:45h (cada día)",
    trigger: "cron",
    status: "active",
    steps: [
      "Lee el timeline de Twitter/X via bird CLI",
      "Filtra noticias de IA, web dev, arquitectura y herramientas dev",
      "Selecciona 5-7 noticias más relevantes para el nicho de Carlos",
      "Genera resumen estructurado con enlace y contexto",
      "Envía digest por Telegram",
    ],
  },
  {
    id: "trend-monitor",
    emoji: "🔥",
    name: "Trend Monitor",
    description: "Radar de tendencias urgentes en el nicho tech. Detecta temas virales antes de que exploten para aprovechar la ola de contenido.",
    schedule: "7h, 10h, 15h y 20h (cada día)",
    trigger: "cron",
    status: "active",
    steps: [
      "Monitoriza trending topics en Twitter/X relacionados con tech y programación",
      "Busca en Hacker News, dev.to y GitHub Trending",
      "Evalúa si el trend es relevante para el canal de Carlos",
      "Si detecta algo urgente, notifica inmediatamente con contexto",
      "Sugiere ángulo de contenido si el trend tiene potencial",
    ],
  },
  {
    id: "daily-linkedin",
    emoji: "📊",
    name: "Daily LinkedIn Brief",
    description: "Genera el post de LinkedIn del día basado en las noticias más relevantes de Hacker News, dev.to y la web tech.",
    schedule: "9h (cada día)",
    trigger: "cron",
    status: "active",
    steps: [
      "Recopila top posts de Hacker News (front page tech/dev)",
      "Revisa trending en dev.to y artículos destacados",
      "Selecciona tema con mayor potencial de engagement para la audiencia de Carlos",
      "Redacta post de LinkedIn en la voz de Carlos (profesional-cercano, sin emojis ni hashtags)",
      "Envía borrador por Telegram para revisión y publicación",
    ],
  },
  {
    id: "newsletter-digest",
    emoji: "📬",
    name: "Newsletter Digest",
    description: "Digest curado de las newsletters del día. Consolida lo mejor de las suscripciones de Carlos en un resumen accionable.",
    schedule: "20h (cada día)",
    trigger: "cron",
    status: "active",
    steps: [
      "Accede a Gmail y busca newsletters recibidas en el día",
      "Filtra por remitentes relevantes (tech, IA, productividad, inversiones)",
      "Extrae los puntos clave de cada newsletter",
      "Genera digest estructurado por categorías",
      "Envía resumen por Telegram",
    ],
  },
  {
    id: "email-categorization",
    emoji: "📧",
    name: "Email Categorization",
    description: "Categoriza y resume los emails del día para que Carlos empiece la jornada sin inbox anxiety.",
    schedule: "7:45h (cada día)",
    trigger: "cron",
    status: "active",
    steps: [
      "Accede a Gmail y lee emails no leídos del día",
      "Categoriza: urgente / colabs / facturas / universidad / newsletters / otros",
      "Resumen de cada categoría con acción recomendada",
      "Detecta emails de clientes con facturas pendientes (>90 días)",
      "Envía resumen estructurado por Telegram",
    ],
  },
  {
    id: "weekly-newsletter",
    emoji: "📅",
    name: "Weekly Newsletter",
    description: "Recapitulación semanal automática de los tweets y posts de LinkedIn para usar como base de la newsletter.",
    schedule: "Domingos 18h",
    trigger: "cron",
    status: "active",
    steps: [
      `Recopila tweets de la semana (${BRANDING.twitterHandle} via bird CLI)`,
      "Recopila posts publicados en LinkedIn",
      "Organiza por temas y relevancia",
      "Genera borrador de recapitulación semanal en tono newsletter",
      "Envía por Telegram para revisión antes de publicar",
    ],
  },
  {
    id: "advisory-board",
    emoji: "🏛️",
    name: "Advisory Board",
    description: "7 asesores IA con personalidades y memorias propias. Consulta a cualquier advisor o convoca al board completo.",
    schedule: "Bajo demanda",
    trigger: "demand",
    status: "active",
    steps: [
      "Carlos envía /cfo, /cmo, /cto, /legal, /growth, /coach o /producto",
      "Tenacitas carga el skill advisory-board/SKILL.md",
      "Lee el archivo de memoria del advisor correspondiente (memory/advisors/)",
      "Responde en la voz y personalidad del advisor con contexto de Carlos",
      "Actualiza el archivo de memoria con lo aprendido en la consulta",
      "/board convoca los 7 advisors en secuencia y compila un board meeting completo",
    ],
  },
  {
    id: "git-backup",
    emoji: "🔄",
    name: "Git Backup",
    description: "Auto-commit y push del workspace cada 4 horas para garantizar que nada se pierde.",
    schedule: "Cada 4h",
    trigger: "cron",
    status: "active",
    steps: [
      "Comprueba si hay cambios en el workspace de Tenacitas",
      "Si hay cambios: git add -A",
      "Genera mensaje de commit automático con timestamp y resumen de cambios",
      "git push al repositorio remoto",
      "Silencioso si no hay cambios — solo notifica si hay error",
    ],
  },
  {
    id: "nightly-evolution",
    emoji: "🌙",
    name: "Nightly Evolution",
    description: "Sesión autónoma nocturna que implementa mejoras en Mission Control según el ROADMAP o inventa features nuevas útiles.",
    schedule: "3h (cada noche)",
    trigger: "cron",
    status: "active",
    steps: [
      "Lee ROADMAP.md de Mission Control para seleccionar la siguiente feature",
      "Si no hay features claras, analiza el estado actual e inventa algo útil",
      "Implementa la feature completa (código, tests si aplica, UI)",
      "Verifica que el build de Next.js no falla",
      "Notifica a Carlos por Telegram con el resumen de lo implementado",
    ],
  },
];

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <div className="flex items-center gap-[5px]">
      <div
        className={`w-[6px] h-[6px] rounded-full ${
          status === "active"
            ? "bg-[var(--success-600)]"
            : "bg-[var(--text-quaternary-500)]"
        }`}
      />
      <span
        className={`font-[family-name:var(--font-text)] text-[10px] font-semibold uppercase tracking-[0.5px] ${
          status === "active"
            ? "text-[var(--success-600)]"
            : "text-[var(--text-quaternary-500)]"
        }`}
      >
        {status === "active" ? "Activo" : "Inactivo"}
      </span>
    </div>
  );
}

function TriggerBadge({ trigger }: { trigger: "cron" | "demand" }) {
  return (
    <div
      className={`px-[7px] py-[2px] rounded-[5px] font-[family-name:var(--font-text)] text-[10px] font-semibold tracking-[0.4px] uppercase ${
        trigger === "cron"
          ? "bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] text-[#60a5fa]"
          : "bg-[var(--brand-600)]/10 border border-[var(--brand-600)]/25 text-[var(--brand-600)]"
      }`}
    >
      {trigger === "cron" ? "⏱ Cron" : "⚡ Demanda"}
    </div>
  );
}

export default function WorkflowsPage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-1px] text-[var(--text-primary-900)] mb-1">
          Workflows
        </h1>
        <p className="font-[family-name:var(--font-text)] text-[13px] text-[var(--text-secondary-700)]">
          {WORKFLOWS.filter(w => w.status === "active").length} flujos activos · {WORKFLOWS.filter(w => w.trigger === "cron").length} crons automáticos · {WORKFLOWS.filter(w => w.trigger === "demand").length} bajo demanda
        </p>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {[
          { label: "Total workflows", value: WORKFLOWS.length, colorClass: "text-[var(--text-primary-900)]" },
          { label: "Crons activos", value: WORKFLOWS.filter(w => w.trigger === "cron" && w.status === "active").length, colorClass: "text-[#60a5fa]" },
          { label: "Bajo demanda", value: WORKFLOWS.filter(w => w.trigger === "demand").length, colorClass: "text-[var(--brand-600)]" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="px-5 py-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl min-w-[140px]"
          >
            <div className={`font-[family-name:var(--font-display)] text-[28px] font-bold tracking-[-1px] ${stat.colorClass}`}>
              {stat.value}
            </div>
            <div className="font-[family-name:var(--font-text)] text-[11px] text-[var(--text-quaternary-500)] mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Workflow cards */}
      <div className="flex flex-col gap-4">
        {WORKFLOWS.map((workflow) => (
          <div
            key={workflow.id}
            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl px-6 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
          >
            {/* Card header */}
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-[var(--bg-tertiary)] flex items-center justify-center text-[20px] border border-[var(--border-secondary)] shrink-0">
                  {workflow.emoji}
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--text-primary-900)] tracking-[-0.3px] mb-0.5">
                    {workflow.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <TriggerBadge trigger={workflow.trigger} />
                    <StatusBadge status={workflow.status} />
                  </div>
                </div>
              </div>
              {/* Schedule */}
              <div className="px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg font-[family-name:var(--font-text)] text-[11px] text-[var(--text-secondary-700)] whitespace-nowrap shrink-0">
                🕐 {workflow.schedule}
              </div>
            </div>

            {/* Description */}
            <p className="font-[family-name:var(--font-text)] text-[13px] text-[var(--text-secondary-700)] leading-relaxed mb-4">
              {workflow.description}
            </p>

            {/* Steps */}
            <div className="bg-[var(--bg-tertiary)] rounded-[10px] px-4 py-3 border border-[var(--border-primary)]">
              <div className="font-[family-name:var(--font-text)] text-[10px] font-semibold text-[var(--text-quaternary-500)] uppercase tracking-[0.7px] mb-2">
                Pasos
              </div>
              <ol className="m-0 pl-4 flex flex-col gap-1">
                {workflow.steps.map((step, i) => (
                  <li
                    key={i}
                    className="font-[family-name:var(--font-text)] text-[12px] text-[var(--text-secondary-700)] leading-normal"
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
