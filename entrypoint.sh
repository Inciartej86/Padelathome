#!/bin/sh

# Este es nuestro script de inicio.
# Inicia el demonio de cron en segundo plano.
crond -l 2 -L /var/log/cron.log

echo "Servicio Cron iniciado."

# Ahora, ejecuta el comando principal que se le pasa al script.
# En nuestro Dockerfile, este será "node server.js".
# 'exec "$@"' ejecuta el CMD del Dockerfile.
echo "Iniciando la aplicación principal (Node.js server)..."
exec "$@"
