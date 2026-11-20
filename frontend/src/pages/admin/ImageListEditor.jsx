// Lista editable de URLs de imágenes (hasta 8): agregar, quitar y reordenar.
// La primera es la imagen principal.
import Button from '../../components/Button';
import ImageWithFallback from '../../components/ImageWithFallback';
import styles from './ProductFormPage.module.css';

const MAX_IMAGES = 8;

export default function ImageListEditor({ images, onChange, error }) {
  function updateAt(index, value) {
    onChange(images.map((url, i) => (i === index ? value : url)));
  }

  function removeAt(index) {
    onChange(images.filter((url, i) => i !== index));
  }

  // Intercambia la imagen `index` con la de `index + direction` (-1 sube, +1 baja).
  function move(index, direction) {
    const copy = [...images];
    const target = index + direction;
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
  }

  return (
    <fieldset className={styles.images} aria-describedby={error ? 'images-error' : undefined}>
      <legend className={styles.legend}>
        Imágenes <span className={styles.legendNote}>(hasta {MAX_IMAGES}; la primera es la principal)</span>
      </legend>

      <ol className={styles.imageList}>
        {images.map((url, index) => {
          const number = index + 1;
          const id = `image-${number}`;
          return (
            <li key={index} className={styles.imageRow}>
              <ImageWithFallback src={url.trim()} alt="" className={styles.preview} />
              <div className={styles.imageField}>
                <div className={styles.imageLabelRow}>
                  <label htmlFor={id} className={styles.imageLabel}>
                    Imagen {number}
                  </label>
                  {index === 0 && <span className={styles.main}>Principal</span>}
                </div>
                <input
                  id={id}
                  type="url"
                  value={url}
                  placeholder="https://..."
                  onChange={(event) => updateAt(index, event.target.value)}
                  className={styles.imageInput}
                  aria-invalid={error ? 'true' : undefined}
                />
                <div className={styles.imageActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Subir imagen ${number}`}
                  >
                    Subir
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label={`Bajar imagen ${number}`}
                  >
                    Bajar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => removeAt(index)}
                    disabled={images.length === 1}
                    aria-label={`Quitar imagen ${number}`}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {error && (
        <p id="images-error" className={styles.error}>
          {error}
        </p>
      )}

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange([...images, ''])}
        disabled={images.length >= MAX_IMAGES}
      >
        Agregar imagen
      </Button>
    </fieldset>
  );
}
