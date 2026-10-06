/**
 * Aparência do app: modo claro ou escuro, salvo no navegador e aplicado no <html>
 * (vale também para a tela de login).
 */
import { useEffect, useId, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

export type Appearance = "light" | "dark";

const STORAGE_KEY = "laudo_appearance";
const LEGACY_KEYS = ["laudo_dark_mode", "laudo_accent", "laudo_glass"];

function readAppearance(): Appearance {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // Preferência do toggle antigo (true/false), se existir.
  const legacy = localStorage.getItem("laudo_dark_mode");
  if (legacy !== null) return legacy === "true" ? "dark" : "light";
  // Primeiro acesso: começa como o sistema operacional.
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export type ThemePreferences = {
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
  toggle: () => void;
  isDark: boolean;
};

export function useThemePreferences(): ThemePreferences {
  const [appearance, setAppearanceState] = useState<Appearance>(readAppearance);
  const isDark = appearance === "dark";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-dark-root", isDark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isDark ? "#000000" : "#f5f5f7");
  }, [isDark]);

  const setAppearance = (value: Appearance) => {
    localStorage.setItem(STORAGE_KEY, value);
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    setAppearanceState(value);
  };

  return {
    appearance,
    setAppearance,
    toggle: () => setAppearance(isDark ? "light" : "dark"),
    isDark,
  };
}

/** Botão de ícone da barra superior. */
export function ThemeToggle({ theme }: { theme: ThemePreferences }) {
  const label = theme.isDark ? "Ativar modo claro" : "Ativar modo escuro";
  return (
    <button
      type="button"
      className="secondary theme-toggle"
      onClick={theme.toggle}
      aria-label={label}
      title={label}
    >
      {theme.isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  );
}

/** Controle segmentado Claro / Escuro (tela de Configurações). */
export function AppearanceControls({ theme }: { theme: ThemePreferences }) {
  const name = useId();
  const options: { id: Appearance; label: string; Icon: typeof SunIcon }[] = [
    { id: "light", label: "Claro", Icon: SunIcon },
    { id: "dark", label: "Escuro", Icon: MoonIcon },
  ];
  return (
    <fieldset className="appearance-group">
      <legend>Aparência</legend>
      <div className="appearance-modes">
        {options.map(({ id, label, Icon }) => (
          <label
            key={id}
            className={`appearance-mode ${theme.appearance === id ? "is-selected" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={id}
              checked={theme.appearance === id}
              onChange={() => theme.setAppearance(id)}
            />
            <Icon size={16} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
