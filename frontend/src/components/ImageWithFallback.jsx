// Imagen en un contenedor 4:3. Debajo siempre está el placeholder con la
// categoría: se ve mientras la imagen carga y queda
// visible si no hay URL o la imagen falla (nunca una imagen rota).
import { useEffect, useState } from 'react';
import styles from './ImageWithFallback.module.css';

export default function ImageWithFallback({ src, alt, label, className = '' }) {
  const [failed, setFailed] = useState(false);

  // Si cambia la imagen (ej. en la galería), se vuelve a intentar.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = src && !failed;

  return (
    <div className={`${styles.frame} ${className}`}>
      <div className={styles.placeholder} role={showImage ? undefined : 'img'} aria-label={showImage ? undefined : alt} aria-hidden={showImage ? 'true' : undefined}>
        {label && <span className={styles.label}>{label}</span>}
      </div>
      {showImage && (
        <img
          src={src}
          alt={alt}
          className={styles.image}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
