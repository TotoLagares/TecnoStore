// Íconos SVG mínimos, dibujados a mano. Heredan el color del texto (currentColor).
// Son decorativos: el texto del botón o un aria-label explica la acción.

function Svg({ children, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconMenu(props) {
  return (
    <Svg {...props}>
      <path d="M2 4h12M2 8h12M2 12h12" />
    </Svg>
  );
}

export function IconClose(props) {
  return (
    <Svg {...props}>
      <path d="M3 3l10 10M13 3L3 13" />
    </Svg>
  );
}

export function IconArrowRight(props) {
  return (
    <Svg {...props}>
      <path d="M2 8h11M9 4l4 4-4 4" />
    </Svg>
  );
}

export function IconArrowLeft(props) {
  return (
    <Svg {...props}>
      <path d="M14 8H3M7 4L3 8l4 4" />
    </Svg>
  );
}

export function IconFilter(props) {
  return (
    <Svg {...props}>
      <path d="M2 4h12M4 8h8M6 12h4" />
    </Svg>
  );
}

export function IconCheck(props) {
  return (
    <Svg {...props}>
      <path d="M3 8.5l3 3 7-7" />
    </Svg>
  );
}

export function IconExternal(props) {
  return (
    <Svg {...props}>
      <path d="M9 3h4v4M13 3L7 9M11 10v3H3V5h3" />
    </Svg>
  );
}

export function IconAlert(props) {
  return (
    <Svg {...props}>
      <path d="M8 2l6.5 12h-13L8 2z" />
      <path d="M8 7v3M8 12v.5" />
    </Svg>
  );
}
