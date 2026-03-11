#!/bin/bash
# envVar.sh - Variables de entorno para los scripts de la red

export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/salud.com/tlsca/tlsca.salud.com-cert.pem
export ORDERER_ADMIN_TLS_SIGN_CERT=${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/tls/server.crt
export ORDERER_ADMIN_TLS_PRIVATE_KEY=${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/tls/server.key

export PEER0_HOSPITAL_CA=${PWD}/organizations/peerOrganizations/hospital.salud.com/tlsca/tlsca.hospital.salud.com-cert.pem
export PEER0_MINSALUD_CA=${PWD}/organizations/peerOrganizations/minsalud.salud.com/tlsca/tlsca.minsalud.salud.com-cert.pem

setGlobals() {
  local USING_ORG=$1
  if [ "$USING_ORG" -eq 1 ]; then
    export CORE_PEER_LOCALMSPID="HospitalMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_HOSPITAL_CA
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/hospital.salud.com/users/Admin@hospital.salud.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
  elif [ "$USING_ORG" -eq 2 ]; then
    export CORE_PEER_LOCALMSPID="MinSaludMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_MINSALUD_CA
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/minsalud.salud.com/users/Admin@minsalud.salud.com/msp
    export CORE_PEER_ADDRESS=localhost:9051
  else
    echo "Organizacion desconocida: ${USING_ORG}"
    exit 1
  fi
}

verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "ERROR: $2"
    exit 1
  fi
}
