import { cloneElement, useEffect, useId, useState, type ReactElement, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";

export function SidebarTooltip({ label, enabled, children }: {
  label: string;
  enabled: boolean;
  children: ReactElement<HTMLAttributes<HTMLElement>>;
}) {
  const tooltipId = useId();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const dismiss = () => setPosition(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const show = (target: HTMLElement) => {
    if (!enabled || !window.matchMedia("(min-width: 901px)").matches) return;
    const bounds = target.getBoundingClientRect();
    const sidebarBounds = target.closest(".sidebar")?.getBoundingClientRect();
    setPosition({ left: (sidebarBounds?.right ?? bounds.right) + 10, top: bounds.top + bounds.height / 2 });
  };

  return (
    <>
      {cloneElement(children, {
        "aria-label": label,
        "aria-describedby": enabled && position ? tooltipId : undefined,
        onMouseEnter: (event) => {
          children.props.onMouseEnter?.(event);
          show(event.currentTarget);
        },
        onMouseLeave: (event) => {
          children.props.onMouseLeave?.(event);
          setPosition(null);
        },
        onFocus: (event) => {
          children.props.onFocus?.(event);
          show(event.currentTarget);
        },
        onBlur: (event) => {
          children.props.onBlur?.(event);
          setPosition(null);
        },
        onClick: (event) => {
          setPosition(null);
          children.props.onClick?.(event);
        },
      })}
      {enabled && position && createPortal(
        <div id={tooltipId} role="tooltip" className="sidebar-tooltip" style={position}>
          {label}
        </div>,
        document.body,
      )}
    </>
  );
}
