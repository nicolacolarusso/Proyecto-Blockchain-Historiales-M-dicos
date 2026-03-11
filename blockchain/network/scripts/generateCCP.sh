#!/bin/bash
# generateCCP.sh - Genera connection profiles con certificados TLS reales

NETWORK_DIR=${PWD}
BACKEND_CONFIG="../../backend/src/config"

generateConnectionProfile() {
  echo "Generando connection profile para Hospital..."

  PEER0_HOSPITAL_TLS_CERT=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' ${NETWORK_DIR}/organizations/peerOrganizations/hospital.salud.com/tlsca/tlsca.hospital.salud.com-cert.pem)
  PEER0_MINSALUD_TLS_CERT=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' ${NETWORK_DIR}/organizations/peerOrganizations/minsalud.salud.com/tlsca/tlsca.minsalud.salud.com-cert.pem)
  CA_HOSPITAL_TLS_CERT=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' ${NETWORK_DIR}/organizations/peerOrganizations/hospital.salud.com/ca/ca.hospital.salud.com-cert.pem)
  CA_MINSALUD_TLS_CERT=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' ${NETWORK_DIR}/organizations/peerOrganizations/minsalud.salud.com/ca/ca.minsalud.salud.com-cert.pem)
  ORDERER_TLS_CERT=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' ${NETWORK_DIR}/organizations/ordererOrganizations/salud.com/tlsca/tlsca.salud.com-cert.pem)

  cat > ${BACKEND_CONFIG}/connection-hospital.json <<EOF
{
  "name": "salud-network-hospital",
  "version": "1.0.0",
  "client": {
    "organization": "Hospital",
    "connection": {
      "timeout": {
        "peer": { "endorser": "300" },
        "orderer": "300"
      }
    }
  },
  "organizations": {
    "Hospital": {
      "mspid": "HospitalMSP",
      "peers": ["peer0.hospital.salud.com"],
      "certificateAuthorities": ["ca-hospital"]
    },
    "MinSalud": {
      "mspid": "MinSaludMSP",
      "peers": ["peer0.minsalud.salud.com"],
      "certificateAuthorities": ["ca-minsalud"]
    }
  },
  "peers": {
    "peer0.hospital.salud.com": {
      "url": "grpcs://localhost:7051",
      "tlsCACerts": {
        "pem": "${PEER0_HOSPITAL_TLS_CERT}"
      },
      "grpcOptions": {
        "ssl-target-name-override": "peer0.hospital.salud.com",
        "hostnameOverride": "peer0.hospital.salud.com"
      }
    },
    "peer0.minsalud.salud.com": {
      "url": "grpcs://localhost:9051",
      "tlsCACerts": {
        "pem": "${PEER0_MINSALUD_TLS_CERT}"
      },
      "grpcOptions": {
        "ssl-target-name-override": "peer0.minsalud.salud.com",
        "hostnameOverride": "peer0.minsalud.salud.com"
      }
    }
  },
  "certificateAuthorities": {
    "ca-hospital": {
      "url": "https://localhost:7054",
      "caName": "ca-hospital",
      "tlsCACerts": {
        "pem": "${CA_HOSPITAL_TLS_CERT}"
      },
      "httpOptions": {
        "verify": false
      }
    },
    "ca-minsalud": {
      "url": "https://localhost:8054",
      "caName": "ca-minsalud",
      "tlsCACerts": {
        "pem": "${CA_MINSALUD_TLS_CERT}"
      },
      "httpOptions": {
        "verify": false
      }
    }
  },
  "orderers": {
    "orderer.salud.com": {
      "url": "grpcs://localhost:7050",
      "tlsCACerts": {
        "pem": "${ORDERER_TLS_CERT}"
      },
      "grpcOptions": {
        "ssl-target-name-override": "orderer.salud.com"
      }
    }
  },
  "channels": {
    "canal-historiales": {
      "orderers": ["orderer.salud.com"],
      "peers": {
        "peer0.hospital.salud.com": {
          "endorsingPeer": true,
          "chaincodeQuery": true,
          "ledgerQuery": true,
          "eventSource": true
        },
        "peer0.minsalud.salud.com": {
          "endorsingPeer": true,
          "chaincodeQuery": true,
          "ledgerQuery": true,
          "eventSource": true
        }
      }
    }
  }
}
EOF

  echo "Connection profile generado en ${BACKEND_CONFIG}/connection-hospital.json"
}

generateConnectionProfile
