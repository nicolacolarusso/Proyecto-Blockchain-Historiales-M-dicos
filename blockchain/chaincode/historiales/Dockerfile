FROM node:18-alpine

WORKDIR /chaincode

# Copiar e instalar dependencias
COPY package.json package-lock.json ./
RUN npm install --production

# Copiar código fuente
COPY index.js ./
COPY lib/ ./lib/

# Variables de entorno para ccaas server mode
ENV CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999
ENV CORE_CHAINCODE_ID_NAME=""

EXPOSE 9999

# Usar fabric-chaincode-node server para modo ccaas
CMD ["npx", "fabric-chaincode-node", "server"]
