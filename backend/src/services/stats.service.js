// Service: Stats (métricas para el dashboard del panel)
// Ver contrato en specs/03-api-contract.md (sección Métricas)

const Product = require('../models/Product');
const Category = require('../models/Category');
const Inquiry = require('../models/Inquiry');

async function getProductStats() {
  const [total, active, outOfStock, featured] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ availability: 'agotado' }),
    Product.countDocuments({ featured: true }),
  ]);
  return { total, active, inactive: total - active, outOfStock, featured };
}

async function getCategoryStats() {
  const [total, active] = await Promise.all([
    Category.countDocuments(),
    Category.countDocuments({ isActive: true }),
  ]);
  return { total, active };
}

async function getInquiryStats() {
  const [total, pendiente, leida, respondida] = await Promise.all([
    Inquiry.countDocuments(),
    Inquiry.countDocuments({ status: 'pendiente' }),
    Inquiry.countDocuments({ status: 'leida' }),
    Inquiry.countDocuments({ status: 'respondida' }),
  ]);
  return { total, pendiente, leida, respondida };
}

// Cantidad de publicaciones (activas o no) de cada categoría, ordenadas por nombre.
async function getProductsByCategory() {
  const categories = await Category.find().sort({ name: 1 });

  return Promise.all(
    categories.map(async (category) => ({
      categoryId: category._id,
      name: category.name,
      count: await Product.countDocuments({ category: category._id }),
    }))
  );
}

exports.getSummary = async function getSummary() {
  const [products, categories, inquiries, productsByCategory, latestInquiries] =
    await Promise.all([
      getProductStats(),
      getCategoryStats(),
      getInquiryStats(),
      getProductsByCategory(),
      Inquiry.find().sort({ createdAt: -1, _id: -1 }).limit(5),
    ]);

  return { products, categories, inquiries, productsByCategory, latestInquiries };
};
