# NER Studio — DevOps Deployment

> A complete DevOps showcase deploying a containerized full-stack Named Entity Recognition application on a local cloud environment, with full CI/CD automation, Infrastructure-as-Code, and observability.

[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Jenkins](https://img.shields.io/badge/Jenkins-D24939?style=flat&logo=jenkins&logoColor=white)](https://www.jenkins.io/)
[![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=flat&logo=terraform&logoColor=white)](https://www.terraform.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=flat&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Grafana-F46800?style=flat&logo=grafana&logoColor=white)](https://grafana.com/)
[![Ubuntu](https://img.shields.io/badge/Ubuntu-E95420?style=flat&logo=ubuntu&logoColor=white)](https://ubuntu.com/)

---

## Overview

This project demonstrates an end-to-end DevOps workflow built around a multi-service Named Entity Recognition application. The goal was not to showcase NLP, but to showcase the **complete infrastructure, automation, and observability lifecycle** that surrounds a production-style application.

The application stack is intentionally non-trivial — four microservices written in three languages — so that the DevOps tooling has something realistic to manage.

### Application services

| Service | Stack | Purpose |
|---|---|---|
| `client` | React + Vite | User-facing web interface |
| `server` | Node.js + Express | REST API, auth, persistence |
| `ai-service` | Python + FastAPI + spaCy | NER inference engine |
| `mongo` | MongoDB 7 | Application database |

### DevOps stack

| Tool | Role |
|---|---|
| **VirtualBox + Ubuntu 26.04 Server** | Local cloud / Type-2 hypervisor |
| **Docker + Docker Compose** | Containerization & orchestration |
| **Jenkins** | Continuous Integration & Deployment |
| **Terraform** | Infrastructure as Code |
| **Prometheus** | Metrics collection |
| **Grafana** | Metrics visualization |
| **node-exporter** | Host system metrics |
| **cAdvisor** | Per-container metrics |

---

## Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                  Windows Host (Developer Laptop)                │
│                                                                 │
│  Browser  ──────►  localhost:5173 (App)                         │
│           ──────►  localhost:8080 (Jenkins)                     │
│           ──────►  localhost:3000 (Grafana)                     │
│           ──────►  localhost:9090 (Prometheus)                  │
│                                                                 │
└────────────────────────────────┬────────────────────────────────┘
                                 │ NAT Port Forwarding
┌────────────────────────────────▼────────────────────────────────┐
│              Ubuntu 26.04 LTS Server VM (VirtualBox)            │
│                                                                 │
│  ┌───────── Application Tier ──────────┐                        │
│  │  ┌────────┐  ┌─────────┐  ┌───────┐ │                        │
│  │  │ client │─►│ server  │─►│  AI   │ │                        │
│  │  │ (5173) │  │ (5050)  │  │(8000) │ │                        │
│  │  └────────┘  └────┬────┘  └───────┘ │                        │
│  │                   ▼                 │                        │
│  │              ┌─────────┐            │                        │
│  │              │ MongoDB │            │                        │
│  │              │ (27017) │            │                        │
│  │              └─────────┘            │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
│  ┌── CI/CD ──┐   ┌── IaC ──┐   ┌────── Observability ───────┐   │
│  │ Jenkins   │   │Terraform│   │ Prometheus ◄─ node-exporter│   │
│  │  :8080    │   │  CLI    │   │     ▲      ◄─── cAdvisor   │   │
│  └─────┬─────┘   └────┬────┘   │     │                      │   │
│        │              │        │  Grafana :3000             │   │
│        │              │        └─────┬──────────────────────┘   │
│        │              │              │                          │
│        ▼              ▼              ▼                          │
│  ┌────────────────────────────────────────┐                     │
│  │           Docker Engine                │                     │
│  └────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

---

## Features

- **Containerized microservices** — each service in its own Docker image with isolated builds
- **One-command deployment** via Docker Compose or Terraform
- **Automated CI/CD pipeline** — Jenkins pulls from Git, rebuilds, redeploys, runs health checks
- **Infrastructure as Code** — every container, network, and volume declared in `.tf` files
- **Real-time observability** — sub-second metric scraping with pre-built Grafana dashboards
- **Reproducible environment** — entire stack rebuildable from scratch on any Linux host
- **Network-isolated VM** — runs on private NAT, accessible from host via port forwarding

---

## Prerequisites

| Requirement | Version |
|---|---|
| Host OS | Windows 10/11, macOS, or Linux |
| RAM | 8 GB minimum (16 GB recommended) |
| Disk | 40 GB free for the VM |
| VirtualBox | 7.x+ |
| Hypervisor | Intel VT-x / AMD-V enabled in BIOS |

---

## Repository Structure

\`\`\`
.
├── app/                        # NER application source
│   ├── ai-service/             # Python FastAPI + spaCy
│   ├── server/                 # Node.js + Express
│   ├── client/                 # React + Vite
│   └── docker-compose.yml      # Application stack
├── jenkins/
│   └── docker-compose.yml      # Jenkins container
├── monitoring/
│   ├── docker-compose.yml      # Prometheus + Grafana + exporters
│   ├── prometheus.yml          # Scrape config
│   └── grafana/provisioning/   # Auto-loaded data sources
└── terraform/
    ├── main.tf                 # Resource declarations
    └── outputs.tf              # Computed outputs
\`\`\`

---

## Getting Started

### 1. Provision the VM

Create an Ubuntu 26.04 Server VM in VirtualBox with 5 GB RAM, 2 CPUs, 30 GB disk. Configure NAT networking with port forwarding for the ports below.

| Service | Host Port | Guest Port |
|---|---|---|
| SSH | 2222 | 22 |
| NER Client | 5173 | 5173 |
| NER Server | 5050 | 5050 |
| AI Service | 8000 | 8000 |
| Jenkins | 8080 | 8080 |
| Grafana | 3000 | 3000 |
| Prometheus | 9090 | 9090 |
| cAdvisor | 8081 | 8081 |
| node-exporter | 9100 | 9100 |

### 2. Install Docker

\`\`\`bash
ssh -p 2222 user@127.0.0.1
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker \$USER
exit
\`\`\`

### 3. Deploy the application

\`\`\`bash
git clone https://github.com/Bhavya0412/NER-devops.git
cd NER-devops/app
cp ai-service/.env.example ai-service/.env
cp server/.env.example server/.env
cp client/.env.example client/.env
docker compose up -d --build
\`\`\`

App is live at **http://localhost:5173**.

### 4. Start Jenkins

\`\`\`bash
cd ../jenkins
docker compose up -d
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
\`\`\`

Open **http://localhost:8080**, paste the password, install suggested plugins.

### 5. Start monitoring

\`\`\`bash
cd ../monitoring
docker compose up -d
\`\`\`

Open **http://localhost:3000** (login `admin` / `admin`). Import dashboards by ID:

| Dashboard | ID | Shows |
|---|---|---|
| Node Exporter Full | 1860 | VM metrics |
| cAdvisor exporter | 14282 | Container metrics |

### 6. Manage with Terraform

\`\`\`bash
cd ../terraform
terraform init
terraform plan
terraform apply
\`\`\`

Terraform-managed containers run on alternate ports (5174, 5051, 8001, 27018) so they coexist with the Compose-managed stack.

---

## CI/CD Pipeline

Jenkins runs this pipeline on every build:

\`\`\`groovy
pipeline {
    agent any
    stages {
        stage('Checkout')     { /* git pull origin main */ }
        stage('Build Images') { /* docker compose build  */ }
        stage('Deploy')       { /* docker compose up -d  */ }
        stage('Health Check') { /* curl /health endpoint */ }
    }
}
\`\`\`

---

## Monitoring

Metrics scraped every 15 seconds:

- **node-exporter** — ~1,000 host metrics (CPU per core, memory, disk I/O, network, load)
- **cAdvisor** — ~500 container metrics for every running container
- **Prometheus** — 15-day time-series retention
- **Grafana** — PromQL queries rendered as dashboards

---

## Verification

\`\`\`bash
curl http://localhost:5173            # NER client
curl http://localhost:8000/health     # AI service → {"ok":true}
curl http://localhost:8080            # Jenkins
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3000            # Grafana
\`\`\`

---

## Design Decisions

**VirtualBox NAT vs bridged?**
Bridged networking is restricted on many college and corporate Wi-Fi networks. NAT with port forwarding works universally.

**Why disable Hindi NER?**
Hindi pipeline pulled in PyTorch + transformers + CUDA (~5 GB). For a DevOps showcase, deployment lifecycle matters more than NER accuracy. Smaller images = faster builds = better CI/CD demo.

**Two NER stacks?**
Compose for development, Terraform for declarative IaC. They run on different ports for educational comparison.

**Jenkins in Docker?**
The container mounts the host's Docker socket, letting it run \`docker compose\` and \`terraform\` against the same daemon. Standard pattern for self-hosted CI.

---

## Author

**Bhavya Shah** 
**Ansh Savarkar**

---

## License

MIT
