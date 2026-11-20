// Service: Categories
// Ver contrato en specs/03-api-contract.md (sección Categorías)

const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const escapeRegex = require('../utils/escapeRegex');

// Cuenta las publicaciones de una categoría. En el listado público solo se
// cuentan las activas; en el de administración, todas.
async function countProducts(categoryId, onlyActive) {
  const filter = { category: categoryId };
  if (onlyActive) filter.isActive = true;
  return Product.countDocuments(filter);
}

// El nombre es único sin distinguir mayúsculas ("notebooks" choca con "Notebooks").
// excludeId sirve para que, al editar, la categoría no choque consigo misma.
async function assertNameAvailable(name, excludeId) {
  const filter = { name: new RegExp(`^${escapeRegex(name)}$`, 'i') };
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await Category.findOne(filter);
  if (existing) {
    throw new ApiError(409, 'Ya existe una categoría con ese nombre');
  }
}

exports.list = async function list({ all } = {}) {
  const filter = all ? {} : { isActive: true };
  const categories = await Category.find(filter).sort({ name: 1 });

  return Promise.all(
    categories.map(async (category) => {
      const productCount = await countProducts(category._id, !all);
      return { ...category.toObject(), productCount };
    })
  );
};

exports.getById = async function getById(id) {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Categoría no encontrada');
  }
  return category;
};

exports.create = async function create(data) {
  await assertNameAvailable(data.name);

  return Category.create({
    name: data.name,
    description: data.description,
    isActive: data.isActive,
  });
};

exports.update = async function update(id, data) {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Categoría no encontrada');
  }

  if (data.name !== undefined) {
    await assertNameAvailable(data.name, category._id);
    category.name = data.name;
  }
  if (data.description !== undefined) category.description = data.description;
  if (data.isActive !== undefined) category.isActive = data.isActive;

  await category.save();
  return category;
};

exports.remove = async function remove(id) {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Categoría no encontrada');
  }

  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw new ApiError(
      409,
      'No se puede eliminar la categoría: tiene publicaciones asociadas'
    );
  }

  await category.deleteOne();
  return true;
};
