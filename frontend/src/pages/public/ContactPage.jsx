// Contacto: formulario de consulta + datos del comercio.
// Si viene ?producto=<id>, precarga el asunto "Consulta por <nombre>".
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createInquiry } from '../../api/inquiries';
import { getProduct } from '../../api/products';
import Button from '../../components/Button';
import Field from '../../components/Field';
import { useToast } from '../../components/Toast';
import { IconCheck } from '../../components/icons';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { useBusinessInfo } from '../../context/BusinessInfoContext';
import useForm from '../../hooks/useForm';
import { validateContact } from '../../utils/validators';
import BusinessDetails from './BusinessDetails';
import styles from './ContactPage.module.css';

const EMPTY_FORM = { name: '', email: '', phone: '', subject: '', message: '' };

function SuccessMessage({ email, onReset }) {
  return (
    <div className={styles.success} role="status">
      <span className={styles.successIcon} aria-hidden="true">
        <IconCheck />
      </span>
      <h2 className={styles.successTitle}>Consulta enviada</h2>
      <p>
        Recibimos tu consulta. Te enviamos una copia a <strong>{email}</strong>.
      </p>
      <Button variant="secondary" onClick={onReset}>
        Enviar otra consulta
      </Button>
    </div>
  );
}

export default function ContactPage() {
  useDocumentTitle('Contacto');
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('producto');
  const [sentTo, setSentTo] = useState(null);

  const form = useForm(EMPTY_FORM, validateContact);
  const { values, errors, submitting } = form;
  const { info } = useBusinessInfo();

  // Precarga del asunto cuando se llega desde el detalle de un producto.
  useEffect(() => {
    if (!productId) return;
    getProduct(productId)
      .then((product) => {
        const subject = `Consulta por ${product.name}`.slice(0, 120);
        form.setValues((current) => (current.subject ? current : { ...current, subject }));
      })
      .catch(() => {
        // Si el producto no existe, el asunto queda vacío.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.validateAll()) return;

    form.setSubmitting(true);
    try {
      const inquiry = await createInquiry({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        subject: values.subject.trim(),
        message: values.message.trim(),
      });
      setSentTo(inquiry.email);
      form.reset();
    } catch (err) {
      form.setFieldErrors(err.fieldErrors);
      showToast(err.message, 'error');
    } finally {
      form.setSubmitting(false);
    }
  }

  return (
    <div className="container page">
      <div className={styles.head}>
        <span className="label">Contacto</span>
        <h1 className={styles.title}>Escribinos</h1>
        <p className={styles.intro}>
          Consultas sobre productos, stock, envíos o formas de pago. Te respondemos por email.
        </p>
      </div>

      <div className={styles.layout}>
        <section className={styles.formCard} aria-label="Formulario de contacto">
          {sentTo ? (
            <SuccessMessage email={sentTo} onReset={() => setSentTo(null)} />
          ) : (
            <form onSubmit={handleSubmit} noValidate className={styles.form}>
              <div className={styles.row}>
                <Field
                  label="Nombre"
                  name="name"
                  value={values.name}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  error={errors.name}
                  autoComplete="name"
                  maxLength={80}
                />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  error={errors.email}
                  autoComplete="email"
                />
              </div>
              <Field
                label="Teléfono"
                optional
                name="phone"
                type="tel"
                value={values.phone}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                error={errors.phone}
                autoComplete="tel"
                maxLength={25}
              />
              <Field
                label="Asunto"
                name="subject"
                value={values.subject}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                error={errors.subject}
                maxLength={120}
              />
              <Field
                label="Mensaje"
                name="message"
                as="textarea"
                value={values.message}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                error={errors.message}
                showCount
                maxLength={2000}
                hint="Mínimo 10 caracteres."
              />
              <div className={styles.actions}>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Enviando…' : 'Enviar consulta'}
                </Button>
              </div>
            </form>
          )}
        </section>

        <aside>{info && <BusinessDetails info={info} title="Otras formas de contacto" />}</aside>
      </div>
    </div>
  );
}
