// Layout del sitio público: navbar arriba, contenido y footer.
import { Outlet } from 'react-router-dom';
import Footer from './Footer';
import Navbar from './Navbar';

export default function PublicLayout() {
  return (
    <>
      <Navbar />
      <main id="contenido">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
