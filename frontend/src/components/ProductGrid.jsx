// Grilla de fichas que comparten bordes (como una tabla de specs).
// 1 columna en mobile, 2 desde 640px, 3 desde 960px y 4 desde 1200px.
import ProductCard from './ProductCard';
import styles from './ProductGrid.module.css';

export default function ProductGrid({ products, columns = 4 }) {
  return (
    <ul className={`${styles.grid} ${columns === 3 ? styles.max3 : ''}`}>
      {products.map((product) => (
        <li key={product._id} className={styles.cell}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
