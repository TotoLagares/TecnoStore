// Campo de formulario con label, ayuda y mensaje de error accesible.
// as: 'input' (default) | 'textarea' | 'select'. Para select, las opciones van como children.
// showCount + maxLength: muestra un contador de caracteres (ej. "120 / 2000").
// action: un botón que va pegado al input (ej. "Mostrar" en las contraseñas).
import styles from './Field.module.css';

export default function Field({
  label,
  name,
  as = 'input',
  error,
  hint,
  showCount = false,
  maxLength,
  value,
  required = false,
  optional = false,
  className = '',
  action,
  children,
  ...rest
}) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : '', hint ? hintId : ''].filter(Boolean).join(' ') || undefined;

  const controlProps = {
    id,
    name,
    value,
    maxLength,
    required,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    className: `${styles.control} ${error ? styles.invalid : ''}`,
    ...rest,
  };

  let control;
  if (as === 'textarea') control = <textarea rows={6} {...controlProps} />;
  else if (as === 'select') control = <select {...controlProps}>{children}</select>;
  else control = <input {...controlProps} />;

  const length = String(value || '').length;

  return (
    <div className={`${styles.field} ${className}`}>
      <div className={styles.top}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {optional && <span className={styles.optional}> (opcional)</span>}
        </label>
        {showCount && maxLength && (
          <span className={`${styles.count} ${length > maxLength ? styles.over : ''}`}>
            {length} / {maxLength}
          </span>
        )}
      </div>
      {action ? (
        <div className={styles.withAction}>
          {control}
          {action}
        </div>
      ) : (
        control
      )}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
