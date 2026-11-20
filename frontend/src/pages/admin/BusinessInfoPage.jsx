// Información institucional del comercio (lo que se ve en Nosotros, Contacto y el footer).
import { useEffect } from 'react';
import { updateBusinessInfo } from '../../api/businessInfo';
import Button from '../../components/Button';
import ErrorState from '../../components/ErrorState';
import Field from '../../components/Field';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { useBusinessInfo } from '../../context/BusinessInfoContext';
import useForm from '../../hooks/useForm';
import { validateBusinessInfo } from '../../utils/validators';
import admin from './Admin.module.css';
import styles from './BusinessInfoPage.module.css';

const MAX_HOURS = 10;

const EMPTY = {
  businessName: '',
  description: '',
  address: '',
  phone: '',
  email: '',
  instagram: '',
  facebook: '',
  whatsapp: '',
  businessHours: [''],
};

// De la API (con socialMedia anidado) a los valores planos del formulario.
function toFormValues(info) {
  if (!info) return EMPTY;
  const social = info.socialMedia || {};
  return {
    businessName: info.businessName || '',
    description: info.description || '',
    address: info.address || '',
    phone: info.phone || '',
    email: info.email || '',
    instagram: social.instagram || '',
    facebook: social.facebook || '',
    whatsapp: social.whatsapp || '',
    businessHours: info.businessHours && info.businessHours.length > 0 ? info.businessHours : [''],
  };
}

// Del formulario al body del PUT. Un campo vacío se manda como "" y el
// backend lo interpreta como "borrar el dato".
function toPayload(values) {
  return {
    businessName: values.businessName.trim(),
    description: values.description.trim(),
    address: values.address.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    socialMedia: {
      instagram: values.instagram.trim(),
      facebook: values.facebook.trim(),
      whatsapp: values.whatsapp.trim(),
    },
    businessHours: values.businessHours.map((line) => line.trim()).filter(Boolean),
  };
}

// Errores del backend: "socialMedia.instagram" -> "instagram", "businessHours[0]" -> "businessHours".
function mapFieldErrors(fieldErrors) {
  const result = {};
  for (const [field, message] of Object.entries(fieldErrors)) {
    if (field.startsWith('socialMedia.')) result[field.replace('socialMedia.', '')] = message;
    else if (field.startsWith('businessHours')) result.businessHours = message;
    else result[field] = message;
  }
  return result;
}

export default function BusinessInfoPage() {
  const { showToast } = useToast();
  // Mismos datos que usa el sitio público (BusinessInfoContext).
  const { info, loading, error, reload } = useBusinessInfo();
  const form = useForm(EMPTY, validateBusinessInfo);
  const { values, errors, submitting } = form;

  useEffect(() => {
    if (!loading) form.reset(toFormValues(info));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, loading]);

  function setHours(businessHours) {
    form.setValues({ ...values, businessHours });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.validateAll()) return;

    form.setSubmitting(true);
    try {
      const saved = await updateBusinessInfo(toPayload(values));
      form.reset(toFormValues(saved));
      reload(); // el sitio público muestra los datos nuevos sin recargar la página
      showToast('Información del comercio guardada');
    } catch (err) {
      form.setFieldErrors(mapFieldErrors(err.fieldErrors));
      showToast(err.message, 'error');
    } finally {
      form.setSubmitting(false);
    }
  }

  // Solo la primera carga muestra el spinner (al recargar después de guardar, el formulario queda).
  if (loading && !info) return <Spinner />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;

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
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <section className={admin.card} aria-labelledby="business-data">
        <div className={admin.cardHead}>
          <h2 id="business-data" className={admin.cardTitle}>
            Datos del comercio
          </h2>
        </div>
        <div className={admin.cardBody}>
          {field('businessName', 'Nombre del comercio', { maxLength: 80 })}
          {field('description', 'Descripción', { as: 'textarea', rows: 4, showCount: true, maxLength: 1000 })}
          <div className={admin.formRow}>
            {field('address', 'Dirección', { maxLength: 150 })}
            {field('phone', 'Teléfono', { type: 'tel', maxLength: 25 })}
          </div>
          {field('email', 'Email', {
            type: 'email',
            hint: 'Es el email de contacto público y el que recibe los avisos de consultas nuevas.',
          })}
        </div>
      </section>

      <section className={admin.card} aria-labelledby="business-social">
        <div className={admin.cardHead}>
          <h2 id="business-social" className={admin.cardTitle}>
            Redes sociales
          </h2>
        </div>
        <div className={admin.cardBody}>
          <div className={admin.formRow}>
            {field('instagram', 'Instagram', { type: 'url', placeholder: 'https://instagram.com/...' })}
            {field('facebook', 'Facebook', { type: 'url', placeholder: 'https://facebook.com/...' })}
          </div>
          {field('whatsapp', 'WhatsApp', {
            inputMode: 'numeric',
            placeholder: '5491140000000',
            hint: 'Solo números, con código de país y de área (8 a 15 dígitos).',
          })}
        </div>
      </section>

      <section className={admin.card} aria-labelledby="business-hours">
        <div className={admin.cardHead}>
          <h2 id="business-hours" className={admin.cardTitle}>
            Horarios
          </h2>
        </div>
        <div className={admin.cardBody}>
          <ol className={styles.hours}>
            {values.businessHours.map((line, index) => {
              const number = index + 1;
              return (
                <li key={index} className={styles.hourRow}>
                  <label htmlFor={`hour-${number}`} className="visually-hidden">
                    Horario {number}
                  </label>
                  <input
                    id={`hour-${number}`}
                    value={line}
                    maxLength={60}
                    placeholder="Ej: Lun a Vie 9 a 18hs"
                    onChange={(event) =>
                      setHours(values.businessHours.map((item, i) => (i === index ? event.target.value : item)))
                    }
                    className={styles.hourInput}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setHours(values.businessHours.filter((item, i) => i !== index))}
                    aria-label={`Quitar horario ${number}`}
                  >
                    Quitar
                  </Button>
                </li>
              );
            })}
          </ol>
          {errors.businessHours && <p className={admin.fieldError}>{errors.businessHours}</p>}
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setHours([...values.businessHours, ''])}
              disabled={values.businessHours.length >= MAX_HOURS}
            >
              Agregar horario
            </Button>
          </div>
        </div>
      </section>

      <div className={styles.footer}>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
