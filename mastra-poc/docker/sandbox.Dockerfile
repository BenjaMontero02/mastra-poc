FROM node:22

# Instalar git (ya viene con la imagen base)
# Instalar docker-cli y docker-compose-plugin desde el repositorio oficial de Docker
RUN apt-get update && apt-get install -y \
    git \
    curl \
    gnupg \
    lsb-release \
    ca-certificates && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && apt-get install -y docker-ce-cli docker-compose-plugin && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
