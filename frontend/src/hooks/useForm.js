// Estado de un formulario: valores, errores por campo y envío.
// validate(values) devuelve { campo: mensaje } (ver utils/validators.js).
import { useState } from 'react';

export default function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Sirve para input, textarea, select y checkbox.
  function handleChange(event) {
    const { name, type, value, checked } = event.target;
    const newValue = type === 'checkbox' ? checked : value;
    const newValues = { ...values, [name]: newValue };
    setValues(newValues);

    // Si el campo ya mostraba un error, se revalida mientras se corrige.
    if (errors[name]) {
      setErrors({ ...errors, [name]: validate(newValues)[name] });
    }
  }

  // Al salir de un campo se valida solo ese campo.
  function handleBlur(event) {
    const { name } = event.target;
    setErrors({ ...errors, [name]: validate(values)[name] });
  }

  // Valida todo antes de enviar. Devuelve true si no hay errores.
  function validateAll() {
    const allErrors = validate(values);
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  }

  // Muestra los errores que devolvió el backend ({ campo: mensaje }).
  function setFieldErrors(fieldErrors) {
    setErrors({ ...errors, ...fieldErrors });
  }

  function reset(newValues = initialValues) {
    setValues(newValues);
    setErrors({});
  }

  return {
    values,
    errors,
    submitting,
    setValues,
    setSubmitting,
    handleChange,
    handleBlur,
    validateAll,
    setFieldErrors,
    reset,
  };
}
