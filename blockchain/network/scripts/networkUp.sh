#!/bin/bash
# networkUp.sh - Script maestro para levantar toda la red blockchain

set -e

# Agregar binarios de Fabric al PATH
export PATH=${PWD}/bin:$PATH
export FABRIC_CFG_PATH=${PWD}/config

echo "============================================"
echo "  Levantando red blockchain - Salud"
echo "  Usando Fabric CA (NO cryptogen)"
echo "============================================"

# Verificar prerrequisitos
echo ""
echo ">>> Verificando prerrequisitos..."
command -v configtxgen >/dev/null 2>&1 || { echo "ERROR: configtxgen no encontrado. Ejecuta primero: ./install-fabric.sh"; exit 1; }
command -v peer >/dev/null 2>&1 || { echo "ERROR: peer no encontrado. Ejecuta primero: ./install-fabric.sh"; exit 1; }
command -v osnadmin >/dev/null 2>&1 || { echo "ERROR: osnadmin no encontrado. Ejecuta primero: ./install-fabric.sh"; exit 1; }
command -v fabric-ca-client >/dev/null 2>&1 || { echo "ERROR: fabric-ca-client no encontrado. Ejecuta primero: ./install-fabric.sh"; exit 1; }
docker info >/dev/null 2>&1 || { echo "ERROR: Docker no esta corriendo"; exit 1; }
echo "Todos los prerrequisitos verificados"

# Paso 1: Levantar las Fabric CAs
echo ""
echo ">>> Paso 1: Levantando Fabric CAs..."
docker compose -f docker/docker-compose-fabric-ca.yaml up -d

echo "Esperando 10 segundos para que las CAs inicien..."
sleep 10

# Paso 2: Registrar y enrollar identidades
echo ""
echo ">>> Paso 2: Registrando identidades con Fabric CA..."
. scripts/registerEnroll.sh

createHospital
createMinSalud
createOrderer

# Paso 3: Generar connection profile con certificados reales
echo ""
echo ">>> Paso 3: Generando connection profiles..."
. scripts/generateCCP.sh

# Paso 4: Levantar peers y orderer
echo ""
echo ">>> Paso 4: Levantando peers y orderer..."
docker compose -f docker/docker-compose-net.yaml up -d

echo "Esperando 10 segundos para que los nodos inicien..."
sleep 10

# Paso 5: Crear canal
echo ""
echo ">>> Paso 5: Creando canal canal-historiales..."
. scripts/createChannel.sh

# Paso 6: Desplegar chaincode
echo ""
echo ">>> Paso 6: Desplegando chaincode historiales..."
. scripts/deployCC.sh

echo ""
echo "============================================"
echo "  Red blockchain levantada exitosamente!"
echo "  Canal: canal-historiales"
echo "  Chaincode: historiales"
echo "  Orgs: Hospital, MinSalud"
echo "  Consensus: Raft"
echo "  PKI: Fabric CA"
echo "============================================"
