/**
 * Identidade do produto: nome e símbolo.
 * O símbolo combina uma folha com o canto dobrado (o laudo) e a letra Ψ (psicologia).
 * O mesmo desenho está em public/favicon.svg; mantenha os dois iguais.
 */
export const APP_NAME = "Pisiclaudo";
export const APP_TAGLINE = "Correção psicológica";

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      {/* Folha com o canto superior direito dobrado */}
      <path
        d="M11 0H35L48 13V37A11 11 0 0 1 37 48H11A11 11 0 0 1 0 37V11A11 11 0 0 1 11 0Z"
        fill="currentColor"
      />
      <path d="M35 0V9A4 4 0 0 0 39 13H48Z" fill="#fff" fillOpacity="0.38" />
      {/* Ψ */}
      <g
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 16v4.5a9 9 0 0 0 18 0V16" />
        <path d="M24 12.5V37" />
        <path d="M19.5 37h9" />
      </g>
    </svg>
  );
}
