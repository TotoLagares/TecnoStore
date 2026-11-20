// Nosotros: descripción del comercio y ficha con sus datos.
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Spinner from '../../components/Spinner';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { useBusinessInfo } from '../../context/BusinessInfoContext';
import BusinessDetails from './BusinessDetails';
import styles from './AboutPage.module.css';

export default function AboutPage() {
  useDocumentTitle('Nosotros');
  const { info, loading, error, reload } = useBusinessInfo();

  let content;
  if (loading) content = <Spinner />;
  else if (error) content = <ErrorState message={error.message} onRetry={reload} />;
  else if (!info)
    content = <EmptyState title="Todavía no cargamos la información del comercio" />;
  else
    content = (
      <div className={styles.layout}>
        <div className={styles.text}>
          <span className="label">Quiénes somos</span>
          <p className={styles.description}>{info.description}</p>
          <p className={styles.secondary}>
            Publicamos cada producto como una ficha técnica: con su código, su estado de stock y el
            precio final en pesos. Si tenés dudas, escribinos y te asesoramos.
          </p>
          <div className={styles.actions}>
            <Button to="/productos" variant="primary">
              Ver catálogo
            </Button>
            <Button to="/contacto" variant="secondary">
              Contacto
            </Button>
          </div>
        </div>
        <BusinessDetails info={info} />
      </div>
    );

  return (
    <div className="container page">
      <div className={styles.head}>
        <span className="label">Nosotros</span>
        <h1 className={styles.title}>{info ? info.businessName : 'Nosotros'}</h1>
      </div>
      {content}
    </div>
  );
}
