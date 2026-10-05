import { z } from 'zod';

const email = z
  .string({ error: 'El correo es obligatorio.' })
  .trim()
  .toLowerCase()
  .max(254, 'El correo es demasiado largo.')
  .pipe(z.email({ error: 'El correo no es válido.' }));

const password = z
  .string({ error: 'La contraseña es obligatoria.' })
  .min(10, 'La contraseña debe tener al menos 10 caracteres.')
  .max(128, 'La contraseña es demasiado larga.')
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), 'La contraseña debe combinar letras y números.');

const name = z
  .string({ error: 'El nombre es obligatorio.' })
  .trim()
  .min(2, 'El nombre es muy corto.')
  .max(60, 'El nombre es muy largo.')
  .refine((v) => !/[<>]/.test(v), 'El nombre contiene caracteres no permitidos.');

const playlistName = z.string().trim().max(60, 'El nombre de la lista es muy largo.').optional().default('');

export const registerSchema = z.object({ email, name, password });

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'La contraseña es obligatoria.' }).min(1, 'La contraseña es obligatoria.').max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Escribe tu contraseña actual.').max(128),
  newPassword: password,
});

export const deleteAccountSchema = z.object({ password: z.string().min(1, 'Escribe tu contraseña.').max(128) });

export const profileSchema = z.object({ name });

export const addPlaylistSchema = z.discriminatedUnion(
  'kind',
  [
    z.object({
      kind: z.literal('xtream'),
      name: playlistName,
      server: z.string().trim().min(3, 'Escribe el servidor.').max(255),
      username: z.string().trim().min(1, 'Escribe el usuario.').max(128),
      password: z.string().min(1, 'Escribe la contraseña.').max(128),
    }),
    z.object({
      kind: z.literal('m3u'),
      name: playlistName,
      url: z.string().trim().min(8, 'Pega la URL de la lista.').max(4096),
    }),
  ],
  { error: 'Tipo de lista no válido.' },
);

export const renamePlaylistSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre.').max(60),
});

export const idParam = z.coerce.number().int().positive();

export const channelQuerySchema = z.object({
  type: z.enum(['live', 'movie', 'series']).default('live'),
  group: z.string().max(120).optional().default(''),
  q: z.string().max(100).optional().default(''),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(60),
});

export const itemKeySchema = z
  .string()
  .max(80)
  .regex(/^(free:[a-z0-9-]+|movie:[a-z0-9-]+|pub:[a-f0-9]{16}|ch:\d{1,12})$/, 'Contenido no válido.');

export const publicQuerySchema = z.object({
  todos: z
    .enum(['0', '1'])
    .optional()
    .transform((v) => v === '1'),
});

export const playResultSchema = z.object({ ok: z.boolean({ error: 'Falta el resultado.' }) });

export const publicListSchema = z.object({
  kind: z.enum(['pais', 'cat'], { error: 'Tipo de lista no válido.' }),
  code: z.string().regex(/^[a-z]{2,20}$/, 'Lista no válida.'),
});
