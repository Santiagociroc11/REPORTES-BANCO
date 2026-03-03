# Migración de Supabase a MongoDB

La aplicación ha sido migrada completamente de Supabase a MongoDB.

## Cambios realizados

### Backend (Nuevo)
- **Servidor Express** en `server/` con MongoDB/Mongoose
- **Modelos**: User, Transaction, Category, Tag, TransactionTag, TelegramConfig
- **API REST** en `/api/*`:
  - `POST /api/auth/login` - Iniciar sesión
  - `POST /api/auth/register` - Registro
  - `GET/PATCH /api/users/:id` - Usuario
  - `GET/POST/PATCH/DELETE /api/transactions` - Transacciones
  - `GET/POST/DELETE /api/categories` - Categorías
  - `GET/POST/DELETE /api/tags` - Etiquetas
  - `GET/PUT /api/telegram-config` - Configuración Telegram

### Frontend
- Eliminada dependencia de `@supabase/supabase-js`
- Nuevo cliente API en `src/lib/mongoApi.ts`
- Todos los componentes actualizados para usar la API MongoDB

## Cómo ejecutar

### Desarrollo local

1. **Instalar dependencias del servidor:**
   ```bash
   cd server && npm install
   ```

2. **Iniciar MongoDB** (si no lo tienes instalado, usa Docker):
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:7
   ```

3. **Iniciar el servidor:**
   ```bash
   npm run server
   ```
   O desde `server/`: `npm run dev`

4. **Iniciar el frontend** (en otra terminal):
   ```bash
   npm run dev
   ```

5. Abre http://localhost:5173

### Con Docker (monolito)

```bash
docker-compose up -d
```

- **App** (frontend + API): http://localhost:3000
- MongoDB: localhost:27017

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del API (frontend, ej: http://localhost:3000/api) |
| `MONGODB_URI` | Cadena de conexión MongoDB (servidor) |
| `PORT` | Puerto del servidor (default: 3000) |

## Migración de datos existentes (Supabase → MongoDB)

Usa el script incluido para migrar todos los datos:

1. **Añade las credenciales de Supabase** a tu `.env`:
   ```
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu-clave-anonima
   ```

2. **Asegúrate de que MongoDB esté corriendo** (local o remoto).

3. **Ejecuta la migración:**
   ```bash
   # Primero prueba sin escribir (dry-run)
   npm run migrate:dry

   # Migración normal
   npm run migrate

   # Migración limpiando datos existentes en MongoDB primero
   npm run migrate:clear
   ```

4. El script migra en este orden: usuarios → categorías → tags → telegram_config → transacciones → transaction_tags

## Notas

- Las contraseñas se almacenan en texto plano (igual que antes). Para producción se recomienda usar bcrypt.
- El endpoint `/api/notify` (notificaciones) no está implementado en el servidor; puedes añadirlo si lo necesitas.
