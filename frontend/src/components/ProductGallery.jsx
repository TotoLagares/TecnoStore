// Galería del detalle: imagen principal y miniaturas clickeables.
import { useState } from 'react';
import ImageWithFallback from './ImageWithFallback';
import styles from './ProductGallery.module.css';

export default function ProductGallery({ images = [], name, label }) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] || images[0];

  return (
    <div className={styles.gallery}>
      <ImageWithFallback
        src={current}
        alt={`${name} - imagen ${selected + 1} de ${images.length || 1}`}
        label={label}
        className={styles.main}
      />

      {images.length > 1 && (
        <ul className={styles.thumbs}>
          {images.map((image, index) => (
            <li key={image + index}>
              <button
                type="button"
                className={`${styles.thumb} ${index === selected ? styles.active : ''}`}
                onClick={() => setSelected(index)}
                aria-label={`Ver imagen ${index + 1}`}
                aria-pressed={index === selected}
              >
                <ImageWithFallback src={image} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
