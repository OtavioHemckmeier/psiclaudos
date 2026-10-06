/**
 * Ícones em linha no estilo SF Symbols (traço arredondado, 24×24).
 * Decorativos por padrão: sempre acompanhados de texto visível ou aria-label no controle.
 */
import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 10.5 12 3.5l8.5 7" />
    <path d="M5.5 9v10.5a1 1 0 0 0 1 1h3.5v-6h4v6h3.5a1 1 0 0 0 1-1V9" />
  </Icon>
);

export const PeopleIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
    <path d="M16 4.8a3.3 3.3 0 0 1 0 6.4" />
    <path d="M18 14.8c1.9.6 3.1 2.3 3.5 5.2" />
  </Icon>
);

export const DocIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M8.5 13h7M8.5 17h5" />
  </Icon>
);

export const ChecklistIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3.5 6 1.8 1.8L8.5 4.5" />
    <path d="m3.5 12.5 1.8 1.8 3.2-3.3" />
    <path d="M3.8 19h4.4" />
    <path d="M12 6h8.5M12 12.5h8.5M12 19h8.5" />
  </Icon>
);

export const PersonCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="10" r="3" />
    <path d="M6.3 18.4c1.2-2 3.2-3.1 5.7-3.1s4.5 1.1 5.7 3.1" />
  </Icon>
);

export const GearIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
);

export const LogoutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 16.5 5.5 12 10 7.5" />
    <path d="M5.5 12H15" />
  </Icon>
);

export const SunIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </Icon>
);

export const MoonIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
  </Icon>
);

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const SidebarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="4.5" width="18" height="15" rx="3" />
    <path d="M9.5 4.5v15" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Icon>
);

export const CheckSealIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.3 2.7 2.7L16.2 9.5" />
  </Icon>
);

export const InfoIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.6v.1" strokeWidth={2.6} />
  </Icon>
);
