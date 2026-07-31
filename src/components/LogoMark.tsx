export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M22 20 C28 26, 30 30, 32 34"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M44 30 C38 32, 34 33, 32 34"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M24 46 C28 40, 30 36, 32 34"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="34" r="2.4" fill="currentColor" />
      <circle cx="20" cy="18" r="9" fill="#0f1b2d" />
      <circle cx="46" cy="29" r="7" fill="#1f6feb" />
      <circle cx="22" cy="48" r="5.5" fill="#1f9d6a" />
    </svg>
  );
}
