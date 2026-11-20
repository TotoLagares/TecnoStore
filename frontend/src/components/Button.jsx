// Botón del sistema de diseño (ver spec, Paleta > Botones).
// variant:
//   'primary'   cobalto: la acción principal de la pantalla (una sola por vista)
//   'dark'      tinta: acciones fuertes secundarias o compactas ("Buscar", "Nueva publicación")
//   'secondary' borde 1px: el resto
//   'danger'    solo para eliminar
// Si recibe `to`, se renderiza como Link (navegación) con el mismo estilo.
import { Link } from 'react-router-dom';
import styles from './Button.module.css';

export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  type = 'button',
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [styles.button, styles[variant], styles[size], fullWidth ? styles.full : '', className]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
