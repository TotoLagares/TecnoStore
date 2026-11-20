// Service: Products
// Ver contrato en specs/03-api-contract.md (sección Productos / Publicaciones)

const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const escapeRegex = require('../utils/escapeRegex');

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

// Opciones de orden aceptadas en ?sort=. El _id desempata para que la
// paginación sea estable cuando hay valores repetidos.
const SORT_OPTIONS = {
  recent: { createdAt: -1, _id: -1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
};

// Arma el filtro de Mongo a partir de los query params comunes a ambos listados.
function buildFilter(query) {
  const filter = {};

  if (query.search) {
    // Búsqueda parcial y sin distinguir mayúsculas en nombre y descripción.
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { description: regex }];
  }

  if (query.category) filter.category = query.category;
  if (query.availability) filter.availability = query.availability;
  if (query.featured !== undefined) filter.featured = query.featured === 'true';

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice !== undefined) filter.price.$lte = Number(query.maxPrice);
  }

  return filter;
}

async function paginate(filter, query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const sort = SORT_OPTIONS[query.sort] || SORT_OPTIONS.recent;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}

async function getActiveCategoryIds() {
  return Category.find({ isActive: true }).distinct('_id');
}

// Listado público: solo publicaciones activas de categorías activas.
exports.listPublic = async function listPublic(query) {
  const filter = buildFilter(query);
  filter.isActive = true;

  const activeCategoryIds = await getActiveCategoryIds();
  filter.$and = [{ category: { $in: activeCategoryIds } }];

  return paginate(filter, query);
};

// Listado de administración: todas, con filtro opcional por isActive.
exports.listAdmin = async function listAdmin(query) {
  const filter = buildFilter(query);
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  return paginate(filter, query);
};

exports.getById = async function getById(id) {
  return Product.findById(id).populate('category', 'name');
};

// Una publicación es visible para el público si está activa y su categoría también.
exports.isPublic = async function isPublic(product) {
  if (!product.isActive || !product.category) return false;

  const category = await Category.findById(product.category._id).select('isActive');
  return Boolean(category && category.isActive);
};

async function assertCategoryExists(categoryId) {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(404, 'La categoría indicada no existe');
  }
}

exports.create = async function create(data) {
  await assertCategoryExists(data.category);

  const product = await Product.create({
    name: data.name,
    category: data.category,
    description: data.description,
    images: data.images,
    price: data.price,
    availability: data.availability,
    featured: data.featured,
    isActive: data.isActive,
  });

  return product.populate('category', 'name');
};

exports.update = async function update(id, data) {
  if (data.category !== undefined) {
    await assertCategoryExists(data.category);
  }

  // Allowlist: solo se actualizan los campos documentados en el contrato.
  const allowedFields = [
    'name',
    'category',
    'description',
    'images',
    'price',
    'availability',
    'featured',
    'isActive',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) updates[field] = data[field];
  }

  const product = await Product.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).populate('category', 'name');

  if (!product) {
    throw new ApiError(404, 'Publicación no encontrada');
  }
  return product;
};

exports.toggleActive = async function toggleActive(id) {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Publicación no encontrada');
  }

  product.isActive = !product.isActive;
  await product.save();

  return product.populate('category', 'name');
};

exports.remove = async function remove(id) {
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    throw new ApiError(404, 'Publicación no encontrada');
  }
  return true;
};
