// Detalle de un producto: galería, ficha, especificaciones y productos relacionados.
import { Link, useParams } from 'react-router-dom';
import { getProduct, getProducts } from '../../api/products';
import AvailabilityIndicator from '../../components/AvailabilityIndicator';
import Button from '../../components/Button';
import ErrorState from '../../components/ErrorState';
import ProductGallery from '../../components/ProductGallery';
import ProductGrid from '../../components/ProductGrid';
import SectionHeader from '../../components/SectionHeader';
import Spinner from '../../components/Spinner';
import { IconArrowRight } from '../../components/icons';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useFetch from '../../hooks/useFetch';
import { formatDate, formatPrice } from '../../utils/format';
import NotFoundPage from './NotFoundPage';
import styles from './ProductDetailPage.module.css';

// Hasta 4 productos de la misma categoría (sin repetir el actual).
function RelatedProducts({ product }) {
  const categoryId = product.category ? product.category._id : '';
  const { data } = useFetch(
    () => (categoryId ? getProducts({ category: categoryId, limit: 5 }) : Promise.resolve(null)),
    [categoryId, product._id]
  );

  if (!data) return null;
  const related = data.items.filter((item) => item._id !== product._id).slice(0, 4);
  if (related.length === 0) return null;

  return (
    <section className={styles.related}>
      <SectionHeader
        title={`Más de ${product.category.name}`}
        linkTo={`/productos?categoria=${categoryId}`}
        linkText="Ver categoría"
      />
      <ProductGrid products={related} />
    </section>
  );
}

function SpecsTable({ product }) {
  return (
    <section className={styles.specs} aria-labelledby="specs-title">
      <h2 id="specs-title" className={styles.specsTitle}>
        Especificaciones
      </h2>
      <table className={styles.table}>
        <tbody>
          <tr>
            <th scope="row">Categoría</th>
            <td>{product.category ? product.category.name : '-'}</td>
          </tr>
          <tr>
            <th scope="row">Disponibilidad</th>
            <td>{product.availability === 'disponible' ? 'Disponible' : 'Agotado'}</td>
          </tr>
          <tr>
            <th scope="row">Publicado</th>
            <td>{formatDate(product.createdAt)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data: product, loading, error, reload } = useFetch(() => getProduct(id), [id]);

  useDocumentTitle(product ? product.name : 'Producto');

  if (loading) {
    return (
      <div className="container page">
        <h1 className="visually-hidden">Producto</h1>
        <Spinner />
      </div>
    );
  }

  // 400 (id inválido), 401 (publicación oculta) o 404: para el visitante, no existe.
  if (error && [400, 401, 404].includes(error.status)) {
    return (
      <NotFoundPage message="No encontramos este producto: puede que ya no esté publicado o que el link sea incorrecto." />
    );
  }

  if (error) {
    return (
      <div className="container page">
        <h1 className="visually-hidden">Producto</h1>
        <ErrorState message={error.message} onRetry={reload} />
      </div>
    );
  }

  const category = product.category;

  return (
    <div className="container page">
      <nav aria-label="Migas de pan" className={styles.breadcrumb}>
        <ol>
          <li>
            <Link to="/productos">Catálogo</Link>
          </li>
          {category && (
            <li>
              <Link to={`/productos?categoria=${category._id}`}>{category.name}</Link>
            </li>
          )}
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className={styles.layout}>
        <ProductGallery
          images={product.images}
          name={product.name}
          label={category ? category.name : ''}
        />

        <div className={styles.info}>
          <div className={styles.infoHead}>
            <AvailabilityIndicator availability={product.availability} />
          </div>

          <div className={styles.infoBody}>
            {category && (
              <Link to={`/productos?categoria=${category._id}`} className={styles.category}>
                {category.name}
              </Link>
            )}
            <h1 className={styles.name}>{product.name}</h1>
            <p className={styles.price}>{formatPrice(product.price)}</p>
            <p className={styles.description}>{product.description}</p>

            <Button to={`/contacto?producto=${product._id}`} variant="primary" fullWidth>
              Consultar por este producto <IconArrowRight />
            </Button>
            <p className={styles.note}>Te respondemos por email. Precio en pesos argentinos.</p>
          </div>

          <SpecsTable product={product} />
        </div>
      </div>

      <RelatedProducts product={product} />
    </div>
  );
}
