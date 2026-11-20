// Modal para crear o editar una categoría.
// category = null -> alta; category = {...} -> edición.
import { useEffect } from 'react';
import { createCategory, updateCategory } from '../../api/categories';
import Button from '../../components/Button';
import Field from '../../components/Field';
import Modal from '../../components/Modal';
import useForm from '../../hooks/useForm';
import { validateCategory } from '../../utils/validators';
import admin from './Admin.module.css';

const EMPTY = { name: '', description: '', isActive: true };

export default function CategoryFormModal({ open, category, onClose, onSaved }) {
  const form = useForm(EMPTY, validateCategory);
  const { values, errors, submitting } = form;

  // Cada vez que se abre, se cargan los valores de la categoría (o vacíos).
  useEffect(() => {
    if (!open) return;
    form.reset(
      category
        ? { name: category.name, description: category.description || '', isActive: category.isActive }
        : EMPTY
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.validateAll()) return;

    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      isActive: values.isActive,
    };

    form.setSubmitting(true);
    try {
      const saved = category ? await updateCategory(category._id, payload) : await createCategory(payload);
      onSaved(saved, Boolean(category));
    } catch (err) {
      // 409: nombre repetido -> se muestra en el campo con el mensaje del backend.
      if (err.status === 409) form.setFieldErrors({ name: err.message });
      else form.setFieldErrors(err.fieldErrors);
    } finally {
      form.setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="category-form" variant="primary" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} noValidate className={admin.modalForm}>
        <Field
          label="Nombre"
          name="name"
          value={values.name}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={errors.name}
          maxLength={50}
        />
        <Field
          label="Descripción"
          name="description"
          as="textarea"
          rows={3}
          value={values.description}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={errors.description}
          showCount
          maxLength={300}
          optional
        />
        <label className={admin.choice}>
          <input type="checkbox" name="isActive" checked={values.isActive} onChange={form.handleChange} />
          Activa
        </label>
      </form>
    </Modal>
  );
}
