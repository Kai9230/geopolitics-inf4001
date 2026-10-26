interface Props {
  color: "green" | "red";
  size?: number;
  dead?: boolean;
}

export function Soldier({ color, size = 40, dead = false }: Props) {
  const body = color === "green" ? "#22c55e" : "#dc2626";
  const armor = color === "green" ? "#15803d" : "#7f1d1d";
  return (
    <svg
      viewBox="0 0 40 60"
      width={size}
      height={size * 1.5}
      style={{
        transform: dead ? "rotate(-90deg) translateY(20px)" : "none",
        opacity: dead ? 0.4 : 1,
        transition: "all 0.6s ease-out",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
      }}
    >
      <ellipse cx="20" cy="57" rx="11" ry="2.5" fill="rgba(0,0,0,0.5)" />
      <rect x="14" y="36" width="4" height="20" fill="#2a1f14" rx="1" />
      <rect x="22" y="36" width="4" height="20" fill="#2a1f14" rx="1" />
      <rect x="11" y="18" width="18" height="20" fill={body} rx="2" stroke={armor} strokeWidth="1" />
      <line x1="11" y1="26" x2="29" y2="26" stroke={armor} strokeWidth="1" opacity="0.5" />
      <circle cx="20" cy="12" r="6" fill="#e8c9a0" stroke="#a8896a" strokeWidth="0.5" />
      <path d="M 13,8 Q 20,2 27,8 L 27,12 L 13,12 Z" fill={body} stroke={armor} strokeWidth="0.8" />
      <line x1="27" y1="22" x2="35" y2="8" stroke="#d0d0d0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="25" y1="24" x2="29" y2="20" stroke="#6b5016" strokeWidth="2" strokeLinecap="round" />
      <circle cx="27" cy="22" r="1.5" fill="#f4c430" />
    </svg>
  );
}