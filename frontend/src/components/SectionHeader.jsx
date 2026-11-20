// Encabezado de sección: título + link opcional + regla de 1px.
import { Link } from 'react-router-dom';
import { IconArrowRight } from './icons';
import styles from './SectionHeader.module.css';

export default function SectionHeader({ title, linkTo, linkText, as: Tag = 'h2' }) {
  return (
    <div className={styles.header}>
      <Tag className={styles.title}>
        {title}
      </Tag>
      {linkTo && (
        <Link to={linkTo} className={styles.link}>
          {linkText} <IconArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
