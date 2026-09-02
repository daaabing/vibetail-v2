/**
 * Line icons for the app chrome, drawn to match the house style: pure
 * stroke, no fills, same weight everywhere. Draw's sketches stay reserved
 * for scenes; these are just wayfinding.
 */
interface IconProps {
  size?: number;
}

function Icon({ size = 22, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}

export function MartiniIcon({ size }: IconProps) {
  return (
    <Icon {...(size ? { size } : {})}>
      <path d="M4 4 h16 L12 13 Z" />
      <path d="M12 13 v7 M8 20 h8 M7.4 7.4 h9.2" />
    </Icon>
  );
}

export function CalendarIcon({ size }: IconProps) {
  return (
    <Icon {...(size ? { size } : {})}>
      <rect height="15" rx="2" width="18" x="3" y="5" />
      <path d="M3 9.5 h18 M8 3 v4 M16 3 v4" />
      <path d="M8 14 h.01 M12 14 h.01 M16 14 h.01" strokeWidth={2.4} />
    </Icon>
  );
}

export function PlusIcon({ size }: IconProps) {
  return (
    <Icon {...(size ? { size } : {})}>
      <path d="M12 5 v14 M5 12 h14" />
    </Icon>
  );
}

export function UserIcon({ size }: IconProps) {
  return (
    <Icon {...(size ? { size } : {})}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20 a7 7 0 0 1 14 0" />
    </Icon>
  );
}

export function CameraIcon({ size }: IconProps) {
  return (
    <Icon {...(size ? { size } : {})}>
      <path d="M4 8 h3.5 l1.5 -2.5 h6 L16.5 8 H20 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 H4 a1 1 0 0 1 -1 -1 V9 a1 1 0 0 1 1 -1 Z" />
      <circle cx="12" cy="13" r="3.4" />
    </Icon>
  );
}

export function CloseIcon({ size }: IconProps) {
  return (
    <Icon {...(size ? { size } : {})}>
      <path d="M6 6 l12 12 M18 6 L6 18" />
    </Icon>
  );
}

export function LocationIcon({ size }: IconProps) {
  return (
    <Icon {...(size ? { size } : {})}>
      <path d="M12 21 s-6.5 -6 -6.5 -11 a6.5 6.5 0 0 1 13 0 c0 5 -6.5 11 -6.5 11 Z" />
      <circle cx="12" cy="9.8" r="2.3" />
    </Icon>
  );
}

export function ChevronIcon({ size, direction = "right" }: IconProps & { direction?: "left" | "right" }) {
  return (
    <Icon {...(size ? { size } : {})}>
      {direction === "right" ? <path d="M9 5 l7 7 -7 7" /> : <path d="M15 5 l-7 7 7 7" />}
    </Icon>
  );
}

export function StarIcon({ size = 26, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      aria-hidden
      fill={filled ? "currentColor" : "none"}
      height={size}
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth={1.6}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M12 3.6 l2.5 5.4 5.9 .6 -4.4 4 1.2 5.8 L12 16.4 6.8 19.4 8 13.6 3.6 9.6 l5.9 -.6 Z" />
    </svg>
  );
}
