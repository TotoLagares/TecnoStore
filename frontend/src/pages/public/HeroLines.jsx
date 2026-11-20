// Fondo de la portada: pistas de una placa de circuito dibujadas en SVG.
// Las líneas grises son fijas; sobre tres de ellas corre despacio un tramo
// azul, como una señal. La animación está en HomePage.module.css.
import styles from './HomePage.module.css';

// Cada pista es un camino de líneas rectas (M = mover, H = horizontal, V = vertical).
const TRACES = [
  'M600 0 V80 H760 V160 H1200',
  'M1200 60 H980 V240 H820 V400',
  'M700 400 V300 H900 V120 H1050 V0',
  'M1200 320 H1080 V260 H960',
  'M480 400 V340 H620 V260 H700',
  'M880 0 V40 H1120 V200 H1200',
];

// Pistas que llevan la "señal" (índices de TRACES).
const SIGNALS = [0, 1, 2];

// Puntos de soldadura al final de algunas pistas.
const NODES = [
  [960, 260],
  [700, 260],
  [760, 160],
  [900, 120],
];

export default function HeroLines() {
  return (
    <svg
      className={styles.heroLines}
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
    >
      {TRACES.map((d) => (
        <path key={d} d={d} className={styles.trace} />
      ))}
      {SIGNALS.map((index, order) => (
        <path
          key={index}
          d={TRACES[index]}
          pathLength="1000"
          className={styles.signal}
          style={{ animationDelay: `${order * 4}s` }}
        />
      ))}
      {NODES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" className={styles.node} />
      ))}
    </svg>
  );
}
