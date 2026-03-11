#!/bin/bash
# registerEnroll.sh - Registro y enrolamiento usando Fabric CA (reemplaza cryptogen)

set -e

function createHospital() {
  echo "========= Registrando identidades para Hospital ==========="

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/hospital.salud.com/

  # Enrollar CA Admin
  fabric-ca-client enroll -u https://admin:adminpw@localhost:7054 \
    --caname ca-hospital \
    --tls.certfiles "${PWD}/organizations/fabric-ca/hospitalCA/ca-cert.pem"

  # Crear config.yaml para NodeOU
  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-hospital.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-hospital.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-hospital.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-hospital.pem
    OrganizationalUnitIdentifier: orderer' > "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml"

  # Registrar peer0
  fabric-ca-client register --caname ca-hospital \
    --id.name peer0 --id.secret peer0pw --id.type peer \
    --tls.certfiles "${PWD}/organizations/fabric-ca/hospitalCA/ca-cert.pem"

  # Registrar admin de la org
  fabric-ca-client register --caname ca-hospital \
    --id.name hospitaladmin --id.secret hospitaladminpw --id.type admin \
    --tls.certfiles "${PWD}/organizations/fabric-ca/hospitalCA/ca-cert.pem"

  # Enrollar peer0
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:7054 \
    --caname ca-hospital \
    -M "${PWD}/organizations/peerOrganizations/hospital.salud.com/peers/peer0.hospital.salud.com/msp" \
    --tls.certfiles "${PWD}/organizations/fabric-ca/hospitalCA/ca-cert.pem" \
    --csr.hosts peer0.hospital.salud.com

  cp "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml" \
    "${PWD}/organizations/peerOrganizations/hospital.salud.com/peers/peer0.hospital.salud.com/msp/config.yaml"

  # Enrollar TLS del peer0
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:7054 \
    --caname ca-hospital \
    -M "${PWD}/organizations/peerOrganizations/hospital.salud.com/peers/peer0.hospital.salud.com/tls" \
    --enrollment.profile tls \
    --csr.hosts peer0.hospital.salud.com --csr.hosts localhost \
    --tls.certfiles "${PWD}/organizations/fabric-ca/hospitalCA/ca-cert.pem"

  # Renombrar TLS certs
  cp "${PWD}/organizations/peerOrganizations/hospital.salud.com/peers/peer0.hospital.salud.com/tls/tlscacerts/"* \
    "${PWD}/organizations/peerOrganizations/hospital.salud.com/peers/peer0.hospital.salud.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/hospital.salud.com/peers/peer0.hospital.salud.com/tls/signcerts/"* \
    "${PWD}/organizations/peerOrganizations/hospital.salud.com/peers/peer0.hospital.salud.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/hospital.salud.com/peers/peer0.hospital.salud.com/tls/keystore/"* \
    "${PWD}/organizations/peerOrganizations/hospital.salud.com/peers/peer0.hospital.salud.com/tls/server.key"

  # Enrollar admin de la org
  fabric-ca-client enroll -u https://hospitaladmin:hospitaladminpw@localhost:7054 \
    --caname ca-hospital \
    -M "${PWD}/organizations/peerOrganizations/hospital.salud.com/users/Admin@hospital.salud.com/msp" \
    --tls.certfiles "${PWD}/organizations/fabric-ca/hospitalCA/ca-cert.pem"

  cp "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml" \
    "${PWD}/organizations/peerOrganizations/hospital.salud.com/users/Admin@hospital.salud.com/msp/config.yaml"

  # Copiar TLS CA cert a directorio tlsca, ca, y msp/tlscacerts
  mkdir -p "${PWD}/organizations/peerOrganizations/hospital.salud.com/tlsca"
  mkdir -p "${PWD}/organizations/peerOrganizations/hospital.salud.com/ca"
  mkdir -p "${PWD}/organizations/peerOrganizations/hospital.salud.com/msp/tlscacerts"
  cp "${PWD}/organizations/peerOrganizations/hospital.salud.com/peers/peer0.hospital.salud.com/tls/ca.crt" \
    "${PWD}/organizations/peerOrganizations/hospital.salud.com/tlsca/tlsca.hospital.salud.com-cert.pem"
  cp "${PWD}/organizations/peerOrganizations/hospital.salud.com/peers/peer0.hospital.salud.com/tls/ca.crt" \
    "${PWD}/organizations/peerOrganizations/hospital.salud.com/msp/tlscacerts/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/hospital.salud.com/msp/cacerts/"* \
    "${PWD}/organizations/peerOrganizations/hospital.salud.com/ca/ca.hospital.salud.com-cert.pem"

  echo "========= Hospital MSP generado exitosamente ==========="
}

function createMinSalud() {
  echo "========= Registrando identidades para MinSalud ==========="

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/minsalud.salud.com/

  fabric-ca-client enroll -u https://admin:adminpw@localhost:8054 \
    --caname ca-minsalud \
    --tls.certfiles "${PWD}/organizations/fabric-ca/minSaludCA/ca-cert.pem"

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-minsalud.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-minsalud.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-minsalud.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-minsalud.pem
    OrganizationalUnitIdentifier: orderer' > "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml"

  fabric-ca-client register --caname ca-minsalud \
    --id.name peer0 --id.secret peer0pw --id.type peer \
    --tls.certfiles "${PWD}/organizations/fabric-ca/minSaludCA/ca-cert.pem"

  fabric-ca-client register --caname ca-minsalud \
    --id.name minsaludadmin --id.secret minsaludadminpw --id.type admin \
    --tls.certfiles "${PWD}/organizations/fabric-ca/minSaludCA/ca-cert.pem"

  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:8054 \
    --caname ca-minsalud \
    -M "${PWD}/organizations/peerOrganizations/minsalud.salud.com/peers/peer0.minsalud.salud.com/msp" \
    --tls.certfiles "${PWD}/organizations/fabric-ca/minSaludCA/ca-cert.pem" \
    --csr.hosts peer0.minsalud.salud.com

  cp "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml" \
    "${PWD}/organizations/peerOrganizations/minsalud.salud.com/peers/peer0.minsalud.salud.com/msp/config.yaml"

  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:8054 \
    --caname ca-minsalud \
    -M "${PWD}/organizations/peerOrganizations/minsalud.salud.com/peers/peer0.minsalud.salud.com/tls" \
    --enrollment.profile tls \
    --csr.hosts peer0.minsalud.salud.com --csr.hosts localhost \
    --tls.certfiles "${PWD}/organizations/fabric-ca/minSaludCA/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/minsalud.salud.com/peers/peer0.minsalud.salud.com/tls/tlscacerts/"* \
    "${PWD}/organizations/peerOrganizations/minsalud.salud.com/peers/peer0.minsalud.salud.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/minsalud.salud.com/peers/peer0.minsalud.salud.com/tls/signcerts/"* \
    "${PWD}/organizations/peerOrganizations/minsalud.salud.com/peers/peer0.minsalud.salud.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/minsalud.salud.com/peers/peer0.minsalud.salud.com/tls/keystore/"* \
    "${PWD}/organizations/peerOrganizations/minsalud.salud.com/peers/peer0.minsalud.salud.com/tls/server.key"

  fabric-ca-client enroll -u https://minsaludadmin:minsaludadminpw@localhost:8054 \
    --caname ca-minsalud \
    -M "${PWD}/organizations/peerOrganizations/minsalud.salud.com/users/Admin@minsalud.salud.com/msp" \
    --tls.certfiles "${PWD}/organizations/fabric-ca/minSaludCA/ca-cert.pem"

  cp "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml" \
    "${PWD}/organizations/peerOrganizations/minsalud.salud.com/users/Admin@minsalud.salud.com/msp/config.yaml"

  # Copiar TLS CA cert a directorio tlsca, ca, y msp/tlscacerts
  mkdir -p "${PWD}/organizations/peerOrganizations/minsalud.salud.com/tlsca"
  mkdir -p "${PWD}/organizations/peerOrganizations/minsalud.salud.com/ca"
  mkdir -p "${PWD}/organizations/peerOrganizations/minsalud.salud.com/msp/tlscacerts"
  cp "${PWD}/organizations/peerOrganizations/minsalud.salud.com/peers/peer0.minsalud.salud.com/tls/ca.crt" \
    "${PWD}/organizations/peerOrganizations/minsalud.salud.com/tlsca/tlsca.minsalud.salud.com-cert.pem"
  cp "${PWD}/organizations/peerOrganizations/minsalud.salud.com/peers/peer0.minsalud.salud.com/tls/ca.crt" \
    "${PWD}/organizations/peerOrganizations/minsalud.salud.com/msp/tlscacerts/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/minsalud.salud.com/msp/cacerts/"* \
    "${PWD}/organizations/peerOrganizations/minsalud.salud.com/ca/ca.minsalud.salud.com-cert.pem"

  echo "========= MinSalud MSP generado exitosamente ==========="
}

function createOrderer() {
  echo "========= Registrando identidades para Orderer ==========="

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/ordererOrganizations/salud.com

  fabric-ca-client enroll -u https://admin:adminpw@localhost:9054 \
    --caname ca-orderer \
    --tls.certfiles "${PWD}/organizations/fabric-ca/ordererCA/ca-cert.pem"

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-orderer.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-orderer.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-orderer.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-orderer.pem
    OrganizationalUnitIdentifier: orderer' > "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml"

  fabric-ca-client register --caname ca-orderer \
    --id.name orderer --id.secret ordererpw --id.type orderer \
    --tls.certfiles "${PWD}/organizations/fabric-ca/ordererCA/ca-cert.pem"

  fabric-ca-client register --caname ca-orderer \
    --id.name ordererAdmin --id.secret ordererAdminpw --id.type admin \
    --tls.certfiles "${PWD}/organizations/fabric-ca/ordererCA/ca-cert.pem"

  fabric-ca-client enroll -u https://orderer:ordererpw@localhost:9054 \
    --caname ca-orderer \
    -M "${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/msp" \
    --tls.certfiles "${PWD}/organizations/fabric-ca/ordererCA/ca-cert.pem" \
    --csr.hosts orderer.salud.com --csr.hosts localhost

  cp "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml" \
    "${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/msp/config.yaml"

  fabric-ca-client enroll -u https://orderer:ordererpw@localhost:9054 \
    --caname ca-orderer \
    -M "${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/tls" \
    --enrollment.profile tls \
    --csr.hosts orderer.salud.com --csr.hosts localhost \
    --tls.certfiles "${PWD}/organizations/fabric-ca/ordererCA/ca-cert.pem"

  cp "${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/tls/tlscacerts/"* \
    "${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/tls/ca.crt"
  cp "${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/tls/signcerts/"* \
    "${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/tls/server.crt"
  cp "${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/tls/keystore/"* \
    "${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/tls/server.key"

  fabric-ca-client enroll -u https://ordererAdmin:ordererAdminpw@localhost:9054 \
    --caname ca-orderer \
    -M "${PWD}/organizations/ordererOrganizations/salud.com/users/Admin@salud.com/msp" \
    --tls.certfiles "${PWD}/organizations/fabric-ca/ordererCA/ca-cert.pem"

  cp "${FABRIC_CA_CLIENT_HOME}/msp/config.yaml" \
    "${PWD}/organizations/ordererOrganizations/salud.com/users/Admin@salud.com/msp/config.yaml"

  # Copiar TLS CA cert a directorio tlsca y msp/tlscacerts
  mkdir -p "${PWD}/organizations/ordererOrganizations/salud.com/tlsca"
  mkdir -p "${PWD}/organizations/ordererOrganizations/salud.com/msp/tlscacerts"
  cp "${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/tls/ca.crt" \
    "${PWD}/organizations/ordererOrganizations/salud.com/tlsca/tlsca.salud.com-cert.pem"
  cp "${PWD}/organizations/ordererOrganizations/salud.com/orderers/orderer.salud.com/tls/ca.crt" \
    "${PWD}/organizations/ordererOrganizations/salud.com/msp/tlscacerts/tlsca.salud.com-cert.pem"

  echo "========= Orderer MSP generado exitosamente ==========="
}

# Solo define funciones — se llaman desde networkUp.sh
