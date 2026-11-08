# UDO Obreros Asistencia (Frontend)

Aplicación frontend construida con SvelteKit.

## Desarrollo

```sh
pnpm install
pnpm dev
```

## Conexión a la base de datos

La carga de la página principal consulta la tabla `usuarios` desde el servidor e
imprime los resultados en la consola del servidor. La contraseña del usuario no
se incluye en la consulta.

Copia las variables de conexión `HOST_BD`, `PUERTO_BD`, `USUARIO_BD`,
`CLAVE_BD` y `NOMBRE_BD` de `UDO-ObrerosAsistencia-BE/.env` a un archivo `.env`
local en este proyecto. No compartas ni confirmes ese archivo.
