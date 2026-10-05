/** Error con mensaje seguro para mostrar al usuario y código HTTP. */
export class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = true;
  }
}

export const notFound = (message = 'No encontrado.') => new AppError(404, message, 'not_found');
export const unauthorized = (message = 'Debes iniciar sesión.') => new AppError(401, message, 'unauthorized');
export const forbidden = (message = 'No tienes permiso para esto.') => new AppError(403, message, 'forbidden');
