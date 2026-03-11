#!/bin/bash
# networkDown.sh - Apagar la red y limpiar artefactos

echo "Apagando red blockchain..."

docker compose -f docker/docker-compose-net.yaml down --volumes --remove-orphans 2>/dev/null || true
docker compose -f docker/docker-compose-fabric-ca.yaml down --volumes --remove-orphans 2>/dev/null || true

# Limpiar artefactos generados
rm -rf organizations/peerOrganizations
rm -rf organizations/ordererOrganizations
rm -rf system-genesis-block
rm -rf channel-artifacts
rm -f *.tar.gz log.txt

# Limpiar contenido generado por las CAs (pero mantener configs)
rm -rf organizations/fabric-ca/hospitalCA/msp
rm -rf organizations/fabric-ca/hospitalCA/tls-cert.pem
rm -rf organizations/fabric-ca/hospitalCA/ca-cert.pem
rm -rf organizations/fabric-ca/hospitalCA/IssuerPublicKey
rm -rf organizations/fabric-ca/hospitalCA/IssuerRevocationPublicKey
rm -rf organizations/fabric-ca/hospitalCA/fabric-ca-server.db

rm -rf organizations/fabric-ca/minSaludCA/msp
rm -rf organizations/fabric-ca/minSaludCA/tls-cert.pem
rm -rf organizations/fabric-ca/minSaludCA/ca-cert.pem
rm -rf organizations/fabric-ca/minSaludCA/IssuerPublicKey
rm -rf organizations/fabric-ca/minSaludCA/IssuerRevocationPublicKey
rm -rf organizations/fabric-ca/minSaludCA/fabric-ca-server.db

rm -rf organizations/fabric-ca/ordererCA/msp
rm -rf organizations/fabric-ca/ordererCA/tls-cert.pem
rm -rf organizations/fabric-ca/ordererCA/ca-cert.pem
rm -rf organizations/fabric-ca/ordererCA/IssuerPublicKey
rm -rf organizations/fabric-ca/ordererCA/IssuerRevocationPublicKey
rm -rf organizations/fabric-ca/ordererCA/fabric-ca-server.db

# Limpiar imagenes de chaincode Docker
docker rmi -f $(docker images -aq --filter reference='dev-peer*') 2>/dev/null || true

echo "Red apagada y artefactos limpiados"
