const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Las cuentas nuevas son de "cliente": no entran al panel. Los admins se
    // cargan con el seed (o cambiando el rol en la base).
    role: { type: String, enum: ['admin', 'cliente'], default: 'cliente' },
    resetToken: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    // Cambio de contraseña pendiente: la nueva queda guardada (hasheada) hasta
    // que el usuario la confirma desde el link que le llega por mail.
    pendingPasswordHash: { type: String, select: false },
    passwordChangeToken: { type: String, select: false },
    passwordChangeExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Al convertir a JSON (respuestas de la API) nunca se incluyen los datos
// sensibles, aunque el documento los tenga cargados (por ejemplo, recién creado).
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.passwordHash;
    delete ret.resetToken;
    delete ret.resetTokenExpires;
    delete ret.pendingPasswordHash;
    delete ret.passwordChangeToken;
    delete ret.passwordChangeExpires;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
