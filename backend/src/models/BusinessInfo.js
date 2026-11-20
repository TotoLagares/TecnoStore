const mongoose = require('mongoose');

const businessInfoSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    // Email de contacto público; también recibe los avisos de nuevas consultas.
    email: { type: String, trim: true, lowercase: true },
    socialMedia: {
      instagram: { type: String, trim: true },
      facebook: { type: String, trim: true },
      whatsapp: { type: String, trim: true },
    },
    businessHours: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BusinessInfo', businessInfoSchema);
