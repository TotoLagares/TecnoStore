// Carrusel horizontal de fichas: se mueve con las flechas o deslizando con el dedo.
// Cada flecha corre el carrusel el ancho de lo que se ve en pantalla.
import { useRef } from 'react';
import ProductCard from './ProductCard';
import { IconArrowLeft, IconArrowRight } from './icons';
import styles from './ProductCarousel.module.css';

export default function ProductCarousel({ products }) {
  const trackRef = useRef(null);

  function move(direction) {
    const track = trackRef.current;
    track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' });
  }

  return (
    <div>
      <ul ref={trackRef} className={styles.track}>
        {products.map((product) => (
          <li key={product._id} className={styles.slide}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>

      <div className={styles.controls}>
        <button type="button" className={styles.arrow} onClick={() => move(-1)} aria-label="Ver anteriores">
          <IconArrowLeft />
        </button>
        <button type="button" className={styles.arrow} onClick={() => move(1)} aria-label="Ver siguientes">
          <IconArrowRight />
        </button>
      </div>
    </div>
  );
}
