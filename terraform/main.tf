terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

# Network for all NER services to communicate
resource "docker_network" "ner_network" {
  name = "ner-network-tf"
}

# MongoDB volume
resource "docker_volume" "mongo_data" {
  name = "ner-mongo-data-tf"
}

# MongoDB image
resource "docker_image" "mongo" {
  name = "mongo:7"
}

# AI Service image (already built locally)
resource "docker_image" "ai_service" {
  name         = "ner-nlp-ai-service:latest"
  keep_locally = true
}

# Server image
resource "docker_image" "server" {
  name         = "ner-nlp-server:latest"
  keep_locally = true
}

# Client image
resource "docker_image" "client" {
  name         = "ner-nlp-client:latest"
  keep_locally = true
}

# MongoDB container
resource "docker_container" "mongo" {
  name    = "ner-mongo-tf"
  image   = docker_image.mongo.image_id
  restart = "unless-stopped"

  ports {
    internal = 27017
    external = 27018
  }

  volumes {
    volume_name    = docker_volume.mongo_data.name
    container_path = "/data/db"
  }

  networks_advanced {
    name    = docker_network.ner_network.name
    aliases = ["mongo"]
  }
}

# AI Service container
resource "docker_container" "ai_service" {
  name    = "ner-ai-service-tf"
  image   = docker_image.ai_service.image_id
  restart = "unless-stopped"

  env = [
    "PORT=8000",
    "SPACY_MODEL=en_core_web_sm",
    "CORS_ORIGINS=http://localhost:5173,http://localhost:5050"
  ]

  ports {
    internal = 8000
    external = 8001
  }

  networks_advanced {
    name    = docker_network.ner_network.name
    aliases = ["ai-service"]
  }
}

# Server container
resource "docker_container" "server" {
  name    = "ner-server-tf"
  image   = docker_image.server.image_id
  restart = "unless-stopped"

  env = [
    "PORT=5050",
    "NODE_ENV=development",
    "MONGODB_URI=mongodb://mongo:27017/ner_app",
    "AI_SERVICE_URL=http://ai-service:8000",
    "CLIENT_ORIGIN=http://localhost:5174",
    "JWT_SECRET=devops_terraform_secret",
    "LOGIN_CODE_SECRET=devops_terraform_login_secret",
    "LOGIN_CODE_TTL_MINUTES=10",
    "LOGIN_CODE_RESEND_SECONDS=30",
    "LOGIN_CODE_DELIVERY=log",
    "EMAIL_FROM=no-reply@ner.local"
  ]

  ports {
    internal = 5050
    external = 5051
  }

  networks_advanced {
    name    = docker_network.ner_network.name
    aliases = ["server"]
  }

  depends_on = [
    docker_container.mongo,
    docker_container.ai_service
  ]
}

# Client container
resource "docker_container" "client" {
  name    = "ner-client-tf"
  image   = docker_image.client.image_id
  restart = "unless-stopped"

  env = [
    "VITE_API_URL=http://localhost:5051"
  ]

  ports {
    internal = 5173
    external = 5174
  }

  networks_advanced {
    name    = docker_network.ner_network.name
    aliases = ["client"]
  }

  depends_on = [
    docker_container.server
  ]
}
