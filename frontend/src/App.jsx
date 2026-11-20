// Definición de todas las rutas de la app (ver specs/04-frontend.md).
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';
import PublicLayout from './layouts/PublicLayout';
import BusinessInfoPage from './pages/admin/BusinessInfoPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import DashboardPage from './pages/admin/DashboardPage';
import InquiriesPage from './pages/admin/InquiriesPage';
import ProductFormPage from './pages/admin/ProductFormPage';
import ProductsPage from './pages/admin/ProductsPage';
import ProfilePage from './pages/admin/ProfilePage';
import UsersPage from './pages/admin/UsersPage';
import ConfirmPasswordChangePage from './pages/auth/ConfirmPasswordChangePage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import AboutPage from './pages/public/AboutPage';
import AccountPage from './pages/public/AccountPage';
import CatalogPage from './pages/public/CatalogPage';
import ContactPage from './pages/public/ContactPage';
import HomePage from './pages/public/HomePage';
import NotFoundPage from './pages/public/NotFoundPage';
import ProductDetailPage from './pages/public/ProductDetailPage';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Sitio público */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/productos" element={<CatalogPage />} />
          <Route path="/productos/:id" element={<ProductDetailPage />} />
          <Route path="/nosotros" element={<AboutPage />} />
          <Route path="/contacto" element={<ContactPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/mi-cuenta" element={<AccountPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Autenticación */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
          <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
          <Route path="/confirmar-contrasena" element={<ConfirmPasswordChangePage />} />
        </Route>

        {/* Panel de administración (requiere sesión de admin) */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/productos" element={<ProductsPage />} />
            <Route path="/admin/productos/nuevo" element={<ProductFormPage />} />
            <Route path="/admin/productos/:id/editar" element={<ProductFormPage />} />
            <Route path="/admin/categorias" element={<CategoriesPage />} />
            <Route path="/admin/consultas" element={<InquiriesPage />} />
            <Route path="/admin/comercio" element={<BusinessInfoPage />} />
            <Route path="/admin/usuarios" element={<UsersPage />} />
            <Route path="/admin/perfil" element={<ProfilePage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
