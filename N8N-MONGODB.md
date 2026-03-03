# Flujo n8n con MongoDB

## Cambios realizados

1. **Nuevo endpoint** `POST /api/transactions/from-notification`:
   - Recibe: `amount`, `description`, `transaction_date`, `transaction_type`, `type`, `notification_email`, `banco`
   - Busca el usuario por `notification_email` (debe coincidir con el campo `email` en la tabla users)
   - Crea la transacción con `reported: false` para que aparezca como pendiente

2. **Nodo Supabase reemplazado** por **HTTP Request** que llama a la API MongoDB

## Importar el workflow

1. En n8n: **Workflows** → **Import from File** → selecciona `n8n-workflow-mongodb.json`
2. Actualiza las credenciales (Gmail, OpenAI, Telegram) si es necesario
3. En el nodo **API MongoDB**, verifica que la URL sea correcta: `https://auto-finanzas.automscc.com/api/transactions/from-notification`
4. Activa el workflow

## Requisito importante

El correo que recibe las notificaciones bancarias (`To` en el email de Gmail) **debe existir** en la tabla `users` con ese mismo `email`. Si no coincide, la API devolverá 404 "Usuario no encontrado".

## Si el nodo HTTP Request da error

En versiones antiguas de n8n, el formato del body puede variar. Configura manualmente:
- **Method**: POST
- **URL**: `https://auto-finanzas.automscc.com/api/transactions/from-notification`
- **Body Content Type**: JSON
- **JSON Body** (expresión):
```
={{ JSON.stringify({
  amount: $json.output.amount,
  description: $json.output.description,
  transaction_date: $json.output.transaction_date,
  transaction_type: $json.output.transaction_type,
  type: $json.output.type,
  notification_email: $('Gmail Trigger').item.json.To,
  banco: $json.output.banco || 'bancolombia'
}) }}
```
