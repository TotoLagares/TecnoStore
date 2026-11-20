// Elegir una contraseña nueva con el token que llegó por mail
// (/restablecer-contrasena?token=...). Si sale bien, va al login con aviso.
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api/auth';
import Button from '../../components/Button';
import Field from '../../components/Field';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useForm from '../../hooks/useForm';
import { validateResetPassword } from '../../utils/validators';
import PasswordRules from './PasswordRules';
import ShowPasswordButton from './ShowPasswordButton';
import styles from './Auth.module.css';

function InvalidLink() {
  return (
    <div className={`${styles.notice} ${styles.error}`} role="alert">
      <p>El enlace no es válido o ya venció.</p>
      <p>
        <Link to="/recuperar-contrasena">Pedir un enlace nuevo</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  useDocumentTitle('Restablecer contraseña');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [invalidToken, setInvalidToken] = useState(token === '');
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm({ newPassword: '', confirmPassword: '' }, validateResetPassword);
  const { values, errors, submitting } = form;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.validateAll()) return;

    form.setSubmitting(true);
    try {
      await resetPassword(token, values.newPassword);
      navigate('/login?restablecida=1', { replace: true });
    } catch (err) {
      // 400 sin errores por campo = token inválido o vencido.
      if (err.status === 400 && Object.keys(err.fieldErrors).length === 0) setInvalidToken(true);
      else form.setFieldErrors(err.fieldErrors);
      form.setSubmitting(false);
    }
  }

  return (
    <>
      <div className={styles.head}>
        <span className="label">Tu cuenta</span>
        <h1 className={styles.title}>Restablecer contraseña</h1>
      </div>

      {invalidToken ? (
        <InvalidLink />
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Field
            label="Nueva contraseña"
            name="newPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={values.newPassword}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={errors.newPassword}
            action={
              <ShowPasswordButton
                visible={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                controls="field-newPassword field-confirmPassword"
              />
            }
          />
          <PasswordRules password={values.newPassword} />
          <Field
            label="Confirmar contraseña"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={errors.confirmPassword}
          />
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Guardando…' : 'Restablecer contraseña'}
          </Button>
        </form>
      )}

      <div className={styles.links}>
        <Link to="/login">Volver a ingresar</Link>
      </div>
    </>
  );
}
