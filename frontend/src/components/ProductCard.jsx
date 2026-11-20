// Ficha de producto para las grillas (Home, Catálogo, "Más de...").
// Toda la ficha es un link al detalle.
import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/format';
import AvailabilityIndicator from './AvailabilityIndicator';
import ImageWithFallback from './ImageWithFallback';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const categoryName = product.category ? product.category.name : '';

  return (
    <Link to={`/productos/${product._id}`} className={styles.card}>
      <ImageWithFallback
        src={product.images && product.images[0]}
        alt={product.name}
        label={categoryName}
      />
      <div className={styles.body}>
        <div className={styles.tags}>
          <span className={styles.category}>{categoryName}</span>
          {product.featured && <span className={styles.featured}>Destacado</span>}
        </div>
        <h3 className={styles.name}>{product.name}</h3>
        <div className={styles.bottom}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          <AvailabilityIndicator availability={product.availability} />
        </div>
      </div>
    </Link>
  );
}
