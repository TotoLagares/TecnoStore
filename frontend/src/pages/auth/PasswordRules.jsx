// Muestra las reglas de la contraseña y marca las que ya se cumplen.
import styles from './Auth.module.css';

export default function PasswordRules({ password }) {
  const rules = [
    { text: 'Al menos 8 caracteres', ok: password.length >= 8 },
    { text: 'Al menos una letra', ok: /[A-Za-z]/.test(password) },
    { text: 'Al menos un número', ok: /[0-9]/.test(password) },
  ];

  return (
    <ul className={styles.rules} aria-label="Requisitos de la contraseña">
      {rules.map((rule) => (
        <li key={rule.text} className={`${styles.rule} ${rule.ok ? styles.ruleOk : ''}`}>
          {rule.text}
          {rule.ok && <span className="visually-hidden"> (cumplido)</span>}
        </li>
      ))}
    </ul>
  );
}
