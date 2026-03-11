#!/bin/bash
# install-fabric.sh - Descarga binarios e imagenes Docker de Hyperledger Fabric
#
# Uso: ./install-fabric.sh
#
# Descarga:
#   - Fabric binaries (peer, orderer, configtxgen, osnadmin, etc.) → ./bin/
#   - Fabric CA binaries (fabric-ca-client, fabric-ca-server) → ./bin/
#   - Fabric Docker images (peer, orderer, ccenv, tools, ca)

set -e

FABRIC_VERSION="2.5.12"
CA_VERSION="1.5.13"

echo "============================================"
echo "  Instalando Hyperledger Fabric ${FABRIC_VERSION}"
echo "  Fabric CA ${CA_VERSION}"
echo "============================================"

# Detectar arquitectura
ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')

if [ "$ARCH" = "x86_64" ]; then
  ARCH="amd64"
elif [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
  ARCH="arm64"
fi

echo "Plataforma detectada: ${OS}-${ARCH}"

# Crear directorio bin
mkdir -p bin

# Descargar binarios de Fabric
echo ""
echo ">>> Descargando binarios de Fabric ${FABRIC_VERSION}..."
FABRIC_URL="https://github.com/hyperledger/fabric/releases/download/v${FABRIC_VERSION}/hyperledger-fabric-${OS}-${ARCH}-${FABRIC_VERSION}.tar.gz"
echo "URL: ${FABRIC_URL}"
curl -sSL "${FABRIC_URL}" | tar xzf - -C .
echo "Binarios de Fabric descargados"

# Descargar binarios de Fabric CA
echo ""
echo ">>> Descargando binarios de Fabric CA ${CA_VERSION}..."
CA_URL="https://github.com/hyperledger/fabric-ca/releases/download/v${CA_VERSION}/hyperledger-fabric-ca-${OS}-${ARCH}-${CA_VERSION}.tar.gz"
echo "URL: ${CA_URL}"
curl -sSL "${CA_URL}" | tar xzf - -C .
echo "Binarios de Fabric CA descargados"

# Descargar imagenes Docker
echo ""
echo ">>> Descargando imagenes Docker de Fabric..."

FABRIC_IMAGES=(
  "hyperledger/fabric-peer:${FABRIC_VERSION}"
  "hyperledger/fabric-orderer:${FABRIC_VERSION}"
  "hyperledger/fabric-ccenv:${FABRIC_VERSION}"
  "hyperledger/fabric-tools:${FABRIC_VERSION}"
  "hyperledger/fabric-baseos:${FABRIC_VERSION}"
  "hyperledger/fabric-nodeenv:${FABRIC_VERSION}"
)

CA_IMAGES=(
  "hyperledger/fabric-ca:${CA_VERSION}"
)

for img in "${FABRIC_IMAGES[@]}"; do
  echo "Descargando ${img}..."
  docker pull "$img"
done

for img in "${CA_IMAGES[@]}"; do
  echo "Descargando ${img}..."
  docker pull "$img"
done

# Tagear imagenes como latest
echo ""
echo ">>> Tageando imagenes como latest..."
for img in "${FABRIC_IMAGES[@]}"; do
  base=$(echo "$img" | cut -d: -f1)
  docker tag "$img" "${base}:latest"
done
for img in "${CA_IMAGES[@]}"; do
  base=$(echo "$img" | cut -d: -f1)
  docker tag "$img" "${base}:latest"
done

# Verificar
echo ""
echo ">>> Verificando instalacion..."
echo "Binarios en ./bin/:"
ls -la bin/
echo ""
echo "Imagenes Docker:"
docker images | grep hyperledger

echo ""
echo "============================================"
echo "  Instalacion completada!"
echo "  Ejecuta: ./scripts/networkUp.sh"
echo "============================================"
