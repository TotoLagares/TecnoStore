// Mi perfil: datos personales y cambio de contraseña, cada bloque con su botón Guardar.
// Se usa en el panel (/admin/perfil) y en Mi cuenta (/mi-cuenta) para los clientes.
// El cambio de contraseña se confirma desde un link que llega por mail.
import { useState } from 'react';
import { updateMe } from '../../api/auth';
import Button from '../../components/Button';
import Field from '../../components/Field';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import useForm from '../../hooks/useForm';
import { validateChangePassword, validateProfile } from '../../utils/validators';
import PasswordRules from '../auth/PasswordRules';
import ShowPasswordButton from '../auth/ShowPasswordButton';
import admin from './Admin.module.css';
import styles from './ProfilePage.module.css';

function PersonalDataForm() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const form = useForm(
    { firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone },
    validateProfile
  );
  const { values, errors, submitting } = form;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.validateAll()) return;

    form.setSubmitting(true);
    try {
      const updated = await updateMe({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
      });
      updateUser(updated);
      form.reset({ firstName: updated.firstName, lastName: updated.lastName, email: updated.email, phone: updated.phone });
      showToast('Datos actualizados');
    } catch (err) {
      // 409: el email ya lo usa otra cuenta (mensaje del backend tal cual).
      if (err.status === 409) form.setFieldErrors({ email: err.message });
      else form.setFieldErrors(err.fieldErrors);
      showToast(err.message, 'error');
    } finally {
      form.setSubmitting(false);
    }
  }

  function field(name, label, props = {}) {
    return (
      <Field
        label={label}
        name={name}
        value={values[name]}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        error={errors[name]}
        {...props}
      />
    );
  }

  return (
    <section className={admin.card} aria-labelledby="personal-data">
      <div className={admin.cardHead}>
        <h2 id="personal-data" className={admin.cardTitle}>
          Datos personales
        </h2>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className={admin.cardBody}>
          <div className={admin.formRow}>
            {field('firstName', 'Nombre', { autoComplete: 'given-name', maxLength: 60 })}
            {field('lastName', 'Apellido', { autoComplete: 'family-name', maxLength: 60 })}
          </div>
          <div className={admin.formRow}>
            {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
            {field('phone', 'Teléfono', { type: 'tel', autoComplete: 'tel', maxLength: 25 })}
          </div>
        </div>
        <div className={admin.formActions}>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function ChangePasswordForm() {
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm({ currentPassword: '', newPassword: '', confirmPassword: '' }, validateChangePassword);
  const { values, errors, submitting } = form;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.validateAll()) return;

    form.setSubmitting(true);
    try {
      await updateMe({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      form.reset();
      showToast('Te enviamos un mail para confirmar el cambio de contraseña');
    } catch (err) {
      // 400 sin errores por campo = la contraseña actual no coincide.
      if (err.status === 400 && Object.keys(err.fieldErrors).length === 0) {
        form.setFieldErrors({ currentPassword: err.message });
      } else {
        form.setFieldErrors(err.fieldErrors);
        // Ej. 502: no se pudo mandar el mail de confirmación.
        showToast(err.message, 'error');
      }
    } finally {
      form.setSubmitting(false);
    }
  }

  const type = showPassword ? 'text' : 'password';

  return (
    <section className={admin.card} aria-labelledby="change-password">
      <div className={admin.cardHead}>
        <h2 id="change-password" className={admin.cardTitle}>
          Cambiar contraseña
        </h2>
        <ShowPasswordButton
          visible={showPassword}
          onToggle={() => setShowPassword(!showPassword)}
          controls="field-currentPassword field-newPassword field-confirmPassword"
        />
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className={admin.cardBody}>
          <Field
            label="Contraseña actual"
            name="currentPassword"
            type={type}
            autoComplete="current-password"
            value={values.currentPassword}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={errors.currentPassword}
          />
          <div className={admin.formRow}>
            <Field
              label="Nueva contraseña"
              name="newPassword"
              type={type}
              autoComplete="new-password"
              value={values.newPassword}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={errors.newPassword}
            />
            <Field
              label="Confirmar contraseña"
              name="confirmPassword"
              type={type}
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={errors.confirmPassword}
            />
          </div>
          <PasswordRules password={values.newPassword} />
        </div>
        <div className={admin.formActions}>
          <Button type="submit" variant="dark" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </section>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  // Normalmente el usuario ya está cargado (viene del login o de localStorage).
  if (!user) return <Spinner />;

  return (
    <div className={styles.page}>
      <PersonalDataForm />
      <ChangePasswordForm />
    </div>
  );
}
