// Home: presentación del comercio (con fondo de circuito), carrusel de destacados y categorías.
// Cada sección trae sus datos por separado y maneja su propio estado.
import { Link } from 'react-router-dom';
import { getCategories } from '../../api/categories';
import { getProducts } from '../../api/products';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ProductCarousel from '../../components/ProductCarousel';
import SectionHeader from '../../components/SectionHeader';
import Spinner from '../../components/Spinner';
import { IconArrowRight } from '../../components/icons';
import { useBusinessInfo } from '../../context/BusinessInfoContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useFetch from '../../hooks/useFetch';
import HeroLines from './HeroLines';
import styles from './HomePage.module.css';

function Hero({ info }) {
  const name = info ? info.businessName : 'TecnoStore';
  const description = info
    ? info.description
    : 'Placas de video, procesadores, memorias, periféricos y monitores.';

  return (
    <section className={styles.hero}>
      <HeroLines />
      <div className={`container ${styles.heroText}`}>
        <span className="label">Hardware para PC</span>
        <h1 className={styles.heroTitle}>{name}</h1>
        <p className={styles.heroDescription}>{description}</p>
        <div className={styles.heroActions}>
          <Button to="/productos" variant="primary">
            Ver catálogo <IconArrowRight />
          </Button>
          <Button to="/contacto" variant="secondary">
            Hacer una consulta
          </Button>
        </div>
      </div>
    </section>
  );
}

function FeaturedSection() {
  const { data, loading, error, reload } = useFetch(
    () => getProducts({ featured: 'true', limit: 8 }),
    []
  );

  let content;
  if (loading) content = <Spinner />;
  else if (error) content = <ErrorState message={error.message} onRetry={reload} />;
  else if (data.items.length === 0)
    content = <EmptyState title="Todavía no hay productos destacados" />;
  else content = <ProductCarousel products={data.items} />;

  return (
    <section className={styles.section}>
      <SectionHeader title="Destacados" linkTo="/productos" linkText="Ver todo" />
      {content}
    </section>
  );
}

function CategoriesSection({ categories, loading, error, reload }) {
  let content;
  if (loading) content = <Spinner />;
  else if (error) content = <ErrorState message={error.message} onRetry={reload} />;
  else if (categories.length === 0) content = <EmptyState title="No hay categorías cargadas" />;
  else
    content = (
      <ul className={styles.categoryGrid}>
        {categories.map((category) => (
          <li key={category._id} className={styles.categoryCell}>
            <Link to={`/productos?categoria=${category._id}`} className={styles.category}>
              <span className={styles.categoryName}>{category.name}</span>
              <span className={styles.categoryCount}>
                {category.productCount} {category.productCount === 1 ? 'producto' : 'productos'}
                <IconArrowRight size={14} />
              </span>
            </Link>
          </li>
        ))}
        <li className={styles.categoryCell}>
          <Link to="/productos" className={`${styles.category} ${styles.categoryAll}`}>
            <span className={styles.categoryName}>Todo el catálogo</span>
            <span className={styles.categoryCount}>
              Ver productos
              <IconArrowRight size={14} />
            </span>
          </Link>
        </li>
      </ul>
    );

  return (
    <section className={styles.section}>
      <SectionHeader title="Categorías" />
      {content}
    </section>
  );
}

export default function HomePage() {
  useDocumentTitle(null); // en el home el título es solo "TecnoStore"

  const { info } = useBusinessInfo();
  const categories = useFetch(() => getCategories(), []);

  return (
    <>
      <Hero info={info} />
      <div className={`container ${styles.content}`}>
        <FeaturedSection />
        <CategoriesSection
          categories={categories.data || []}
          loading={categories.loading}
          error={categories.error}
          reload={categories.reload}
        />
      </div>
    </>
  );
}
