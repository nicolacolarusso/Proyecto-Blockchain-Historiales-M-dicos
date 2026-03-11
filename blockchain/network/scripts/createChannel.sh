#!/bin/bash
# createChannel.sh - Crear el canal canal-historiales y unir los peers

set -e

CHANNEL_NAME="canal-historiales"
DELAY=3
MAX_RETRY=5
VERBOSE=false

. scripts/envVar.sh

createChannelGenesisBlock() {
  echo "Generando bloque genesis del canal '${CHANNEL_NAME}'..."

  configtxgen -profile SaludGenesis \
    -outputBlock ./channel-artifacts/${CHANNEL_NAME}.block \
    -channelID $CHANNEL_NAME \
    -configPath ./configtx/

  echo "Bloque genesis generado exitosamente"
}

createChannel() {
  setGlobals 1  # Usar Hospital como creador

  echo "Creando canal ${CHANNEL_NAME}..."

  osnadmin channel join \
    --channelID $CHANNEL_NAME \
    --config-block ./channel-artifacts/${CHANNEL_NAME}.block \
    -o localhost:7053 \
    --ca-file "$ORDERER_CA" \
    --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" \
    --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY"

  echo "Canal creado exitosamente"
}

joinChannel() {
  ORG=$1
  setGlobals $ORG

  echo "Uniendo peer de Org${ORG} al canal ${CHANNEL_NAME}..."

  local rc=1
  local COUNTER=0
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    sleep $DELAY
    peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block
    rc=$?
    COUNTER=$((COUNTER + 1))
  done

  if [ $rc -ne 0 ]; then
    echo "ERROR: Fallo al unir peer de Org${ORG} al canal despues de ${MAX_RETRY} intentos"
    exit 1
  fi

  echo "Peer de Org${ORG} unido exitosamente al canal"
}

setAnchorPeer() {
  ORG=$1
  echo "Anchor peers para Org${ORG} ya definidos en configtx.yaml (genesis block). OK."
}

# Crear directorio de artefactos
mkdir -p channel-artifacts

# Ejecutar
createChannelGenesisBlock
createChannel
joinChannel 1  # Hospital
joinChannel 2  # MinSalud
setAnchorPeer 1
setAnchorPeer 2

echo "===================== Canal ${CHANNEL_NAME} creado y peers unidos ====================="
