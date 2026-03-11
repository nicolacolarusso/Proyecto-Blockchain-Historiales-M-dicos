#!/bin/bash
# deployCC.sh - Desplegar chaincode usando Chaincode-as-a-Service (ccaas)
# Evita Docker-in-Docker, compatible con Docker Desktop moderno

set -e

CHANNEL_NAME="canal-historiales"
CC_NAME="historiales"
CC_SRC_PATH="../chaincode/historiales"
CC_VERSION="1.0"
CC_SEQUENCE=1
CC_LABEL="${CC_NAME}_${CC_VERSION}"

# Puerto donde correrá el chaincode como servicio
CC_PORT=9999

. scripts/envVar.sh

echo "============================================"
echo "  Desplegando chaincode con CCAAS builder"
echo "============================================"

# -----------------------------------------------
# Paso 1: Construir imagen Docker del chaincode
# -----------------------------------------------
buildChaincodeImage() {
  echo ""
  echo ">>> Paso 1: Construyendo imagen Docker del chaincode..."

  docker build -t ${CC_NAME}_ccaas:latest ${CC_SRC_PATH}

  echo "Imagen ${CC_NAME}_ccaas:latest construida exitosamente"
}

# -----------------------------------------------
# Paso 2: Empaquetar chaincode en formato ccaas
# -----------------------------------------------
packageChaincodeCCaas() {
  echo ""
  echo ">>> Paso 2: Empaquetando chaincode en formato CCAAS..."

  # Crear directorio temporal para el paquete
  local PKGDIR=$(mktemp -d)

  # metadata.json - indica que es tipo ccaas
  cat > "${PKGDIR}/metadata.json" <<METAEOF
{
  "type": "ccaas",
  "label": "${CC_LABEL}"
}
METAEOF

  # connection.json - dirección donde el peer encontrará el chaincode
  # Usamos el nombre del contenedor Docker que resolverá en la red fabric_salud
  cat > "${PKGDIR}/connection.json" <<CONNEOF
{
  "address": "${CC_NAME}_ccaas:${CC_PORT}",
  "dial_timeout": "10s",
  "tls_required": false
}
CONNEOF

  # Crear code.tar.gz con connection.json
  tar czf "${PKGDIR}/code.tar.gz" -C "${PKGDIR}" connection.json

  # Crear el paquete final .tar.gz con metadata.json y code.tar.gz
  tar czf "${CC_NAME}.tar.gz" -C "${PKGDIR}" metadata.json code.tar.gz

  # Limpiar
  rm -rf "${PKGDIR}"

  echo "Paquete CCAAS creado: ${CC_NAME}.tar.gz"
}

# -----------------------------------------------
# Paso 3: Instalar chaincode en ambas orgs
# -----------------------------------------------
installChaincode() {
  ORG=$1
  setGlobals $ORG

  echo ""
  echo ">>> Instalando chaincode CCAAS en Org${ORG}..."

  peer lifecycle chaincode install ${CC_NAME}.tar.gz

  echo "Chaincode instalado en Org${ORG}"
}

# -----------------------------------------------
# Paso 4: Obtener Package ID
# -----------------------------------------------
queryInstalled() {
  ORG=$1
  setGlobals $ORG

  peer lifecycle chaincode queryinstalled >&log.txt
  PACKAGE_ID=$(sed -n "/${CC_LABEL}/{s/^Package ID: //; s/, Label:.*$//; p;}" log.txt)

  echo "PackageID: ${PACKAGE_ID}"
}

# -----------------------------------------------
# Paso 5: Aprobar chaincode por cada org
# -----------------------------------------------
approveForMyOrg() {
  ORG=$1
  setGlobals $ORG

  echo ""
  echo ">>> Aprobando chaincode para Org${ORG}..."

  peer lifecycle chaincode approveformyorg \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.salud.com \
    --tls \
    --cafile "$ORDERER_CA" \
    --channelID $CHANNEL_NAME \
    --name ${CC_NAME} \
    --version ${CC_VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence ${CC_SEQUENCE}

  echo "Chaincode aprobado por Org${ORG}"
}

# -----------------------------------------------
# Paso 6: Commit chaincode definition
# -----------------------------------------------
commitChaincodeDefinition() {
  echo ""
  echo ">>> Commitiendo definicion del chaincode..."

  peer lifecycle chaincode commit \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.salud.com \
    --tls \
    --cafile "$ORDERER_CA" \
    --channelID $CHANNEL_NAME \
    --name ${CC_NAME} \
    --version ${CC_VERSION} \
    --sequence ${CC_SEQUENCE} \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles "$PEER0_HOSPITAL_CA" \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles "$PEER0_MINSALUD_CA"

  echo "Chaincode commiteado exitosamente"
}

# -----------------------------------------------
# Paso 7: Verificar commit
# -----------------------------------------------
queryCommitted() {
  echo ""
  echo ">>> Verificando chaincode commiteado..."

  peer lifecycle chaincode querycommitted \
    --channelID $CHANNEL_NAME \
    --name ${CC_NAME} \
    --cafile "$ORDERER_CA"
}

# -----------------------------------------------
# Paso 8: Lanzar contenedor del chaincode
# -----------------------------------------------
launchChaincodeContainer() {
  echo ""
  echo ">>> Lanzando contenedor del chaincode como servicio..."

  # Detener contenedor anterior si existe
  docker rm -f ${CC_NAME}_ccaas 2>/dev/null || true

  # Lanzar chaincode como contenedor en la red fabric_salud
  docker run -d \
    --name ${CC_NAME}_ccaas \
    --network fabric_salud \
    ${CC_NAME}_ccaas:latest \
    npx fabric-chaincode-node server \
      --chaincode-address 0.0.0.0:${CC_PORT} \
      --chaincode-id "${PACKAGE_ID}"

  echo "Contenedor ${CC_NAME}_ccaas lanzado"

  # Esperar a que inicie
  echo "Esperando 5 segundos para que el chaincode inicie..."
  sleep 5

  # Verificar que esté corriendo
  if docker ps --filter "name=${CC_NAME}_ccaas" --filter "status=running" | grep -q ${CC_NAME}_ccaas; then
    echo "Contenedor del chaincode corriendo exitosamente"
  else
    echo "ADVERTENCIA: El contenedor del chaincode no parece estar corriendo"
    docker logs ${CC_NAME}_ccaas 2>&1 | tail -20
  fi
}

# -----------------------------------------------
# Ejecutar pipeline completo
# -----------------------------------------------
buildChaincodeImage
packageChaincodeCCaas
installChaincode 1  # Hospital
installChaincode 2  # MinSalud
queryInstalled 1
approveForMyOrg 1
approveForMyOrg 2
commitChaincodeDefinition
queryCommitted
launchChaincodeContainer

echo ""
echo "===================== Chaincode ${CC_NAME} desplegado exitosamente con CCAAS ====================="
