// Formulario de publicación: el mismo para crear (/admin/productos/nuevo)
// y para editar (/admin/productos/:id/editar).
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCategories } from '../../api/categories';
import { createProduct, getProduct, updateProduct } from '../../api/products';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorState from '../../components/ErrorState';
import Field from '../../components/Field';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import useForm from '../../hooks/useForm';
import { validateProduct } from '../../utils/validators';
import admin from './Admin.module.css';
import ImageListEditor from './ImageListEditor';
import styles from './ProductFormPage.module.css';

const EMPTY_PRODUCT = {
  name: '',
  category: '',
  description: '',
  price: '',
  availability: 'disponible',
  featured: false,
  isActive: true,
  images: [''],
};

// Pasa una publicación de la API a los valores del formulario.
function toFormValues(product) {
  return {
    name: product.name,
    category: product.category ? product.category._id : '',
    description: product.description,
    price: String(product.price),
    availability: product.availability,
    featured: product.featured,
    isActive: product.isActive,
    images: product.images.length > 0 ? product.images : [''],
  };
}

// Los errores del backend para imágenes vienen como "images" o "images[2]".
function mapFieldErrors(fieldErrors) {
  const result = {};
  for (const [field, message] of Object.entries(fieldErrors)) {
    result[field.startsWith('images') ? 'images' : field] = message;
  }
  return result;
}

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [initialValues, setInitialValues] = useState(EMPTY_PRODUCT);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const form = useForm(EMPTY_PRODUCT, validateProduct);
  const { values, errors, submitting } = form;

  const { data: categories } = useFetch(() => getCategories({ all: true }), []);
  const productFetch = useFetch(() => (isEdit ? getProduct(id) : Promise.resolve(null)), [id]);

  // Al editar, cuando llega la publicación se cargan sus valores en el formulario.
  useEffect(() => {
    if (productFetch.data) {
      const loaded = toFormValues(productFetch.data);
      setInitialValues(loaded);
      form.reset(loaded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productFetch.data]);

  // Hay cambios sin guardar si los valores difieren de los iniciales.
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  function handleCancel() {
    if (isDirty) setConfirmLeave(true);
    else navigate('/admin/productos');
  }

  function setImages(images) {
    form.setValues({ ...values, images });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.validateAll()) return;

    const payload = {
      name: values.name.trim(),
      category: values.category,
      description: values.description.trim(),
      price: Number(values.price),
      availability: values.availability,
      featured: values.featured,
      isActive: values.isActive,
      images: values.images.map((url) => url.trim()).filter(Boolean),
    };

    form.setSubmitting(true);
    try {
      if (isEdit) await updateProduct(id, payload);
      else await createProduct(payload);
      showToast(isEdit ? 'Publicación actualizada' : 'Publicación creada');
      navigate('/admin/productos');
    } catch (err) {
      form.setFieldErrors(mapFieldErrors(err.fieldErrors));
      showToast(err.message, 'error');
      form.setSubmitting(false);
    }
  }

  if (productFetch.loading) return <Spinner />;
  if (productFetch.error) {
    return <ErrorState message={productFetch.error.message} onRetry={productFetch.reload} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <div className={styles.layout}>
        <section className={admin.card} aria-labelledby="product-data">
          <div className={admin.cardHead}>
            <h2 id="product-data" className={admin.cardTitle}>
              Datos de la publicación
            </h2>
          </div>
          <div className={admin.cardBody}>
            <Field
              label="Nombre"
              name="name"
              value={values.name}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={errors.name}
              maxLength={120}
            />
            <div className={admin.formRow}>
              <Field
                label="Categoría"
                name="category"
                as="select"
                value={values.category}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                error={errors.category}
              >
                <option value="">Elegí una categoría</option>
                {(categories || []).map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                    {category.isActive ? '' : ' (inactiva)'}
                  </option>
                ))}
              </Field>
              <Field
                label="Precio"
                name="price"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={values.price}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                error={errors.price}
                hint="En pesos, sin puntos ni signo $."
              />
            </div>
            <Field
              label="Descripción"
              name="description"
              as="textarea"
              value={values.description}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              error={errors.description}
              showCount
              maxLength={2000}
            />
            <fieldset className={admin.choices}>
              <legend>Disponibilidad</legend>
              <label className={admin.choice}>
                <input
                  type="radio"
                  name="availability"
                  value="disponible"
                  checked={values.availability === 'disponible'}
                  onChange={form.handleChange}
                />
                Disponible
              </label>
              <label className={admin.choice}>
                <input
                  type="radio"
                  name="availability"
                  value="agotado"
                  checked={values.availability === 'agotado'}
                  onChange={form.handleChange}
                />
                Agotado
              </label>
            </fieldset>
            <div className={admin.choices}>
              <label className={admin.choice}>
                <input type="checkbox" name="featured" checked={values.featured} onChange={form.handleChange} />
                Destacado
              </label>
              <label className={admin.choice}>
                <input type="checkbox" name="isActive" checked={values.isActive} onChange={form.handleChange} />
                Publicada
              </label>
            </div>
          </div>
        </section>

        <section className={admin.card}>
          <div className={admin.cardBody}>
            <ImageListEditor images={values.images} onChange={setImages} error={errors.images} />
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" onClick={handleCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title="Descartar cambios"
        message="Tenés cambios sin guardar. Si salís ahora, se pierden."
        onConfirm={() => navigate('/admin/productos')}
        onCancel={() => setConfirmLeave(false)}
      />
    </form>
  );
}
