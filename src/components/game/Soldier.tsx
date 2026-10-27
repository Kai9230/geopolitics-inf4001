type Props = {
  color: "green" | "red";
  size?: number;
  dead?: boolean;
};

export function Soldier({
  color,
  size = 40,
  dead = false,
}: Props) {
  const body =
    color === "green" ? "#22c55e" : "#dc2626";

  const armor =
    color === "green" ? "#15803d" : "#7f1d1d";

  return (
    <svg
      viewBox="0 0 40 60"
      width={size}
      height={size * 1.5}
      aria-hidden="true"
      style={{
        opacity: dead ? 0.3 : 1,
      }}
    >
      <ellipse
        cx="20"
        cy="57"
        rx="11"
        ry="2.5"
        fill="#0006"
      />

      <rect
        x="14"
        y="36"
        width="4"
        height="20"
        fill="#2a1f14"
        rx="1"
      />

      <rect
        x="22"
        y="36"
        width="4"
        height="20"
        fill="#2a1f14"
        rx="1"
      />

      <rect
        x="11"
        y="18"
        width="18"
        height="20"
        fill={body}
        rx="2"
        stroke={armor}
      />

      <path
        d="M11 26H29"
        stroke={armor}
        opacity=".5"
      />

      <circle
        cx="20"
        cy="12"
        r="6"
        fill="#e8c9a0"
        stroke="#a8896a"
        strokeWidth=".5"
      />

      <path
        d="M13 8Q20 2 27 8V12H13Z"
        fill={body}
        stroke={armor}
        strokeWidth=".8"
      />

      <path
        d="M27 22L35 8"
        stroke="#d0d0d0"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <path
        d="M25 24L29 20"
        stroke="#6b5016"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <circle
        cx="27"
        cy="22"
        r="1.5"
        fill="#f4c430"
      />
    </svg>
  );
}