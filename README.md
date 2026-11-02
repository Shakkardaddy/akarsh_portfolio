# Docker Containerization & Deployment Lab

## Application Name
**Akarsh - Web Resume & Developer Portfolio**

---

## Technology Stack
- **Frontend:** HTML5, CSS3, Responsive Modern UI, Google Fonts (Inter)
- **Web Server:** Nginx (Alpine Linux)
- **Containerization Engine:** Docker (Docker Desktop v29.7.2, WSL2 Engine)
- **Image Registry:** Docker Hub (`shakkardaddy1/portfolio`)
- **Deployment Environments:** Local Host (Windows 11) & Remote Virtual Machine (Linux VM)

---

## Dockerfile
The application uses the official lightweight Nginx Alpine base image to serve the static portfolio assets.

```dockerfile
# Step 1: Base image - lightweight Nginx web server on Alpine Linux
FROM nginx:alpine

# Step 2: Copy web application source files into Nginx public directory
COPY source-code/ /usr/share/nginx/html

# Step 3: Expose port 80 for web traffic
EXPOSE 80

# Step 4: Run Nginx in foreground to keep container active
CMD ["nginx", "-g", "daemon off;"]
```

### Explanation of Instructions Used
- `FROM nginx:alpine`: Pulls the minimal Alpine Linux-based Nginx official image (~43 MB), providing a secure, lightweight, and isolated web server environment.
- `COPY source-code/ /usr/share/nginx/html`: Copies the application files (`index.html`, `style.css`) from the host project directory into the default Nginx document root directory inside the container.
- `EXPOSE 80`: Documents and opens port 80 inside the container for incoming HTTP web traffic.
- `CMD ["nginx", "-g", "daemon off;"]`: Instructs Docker to run Nginx in the foreground so the container stays running as an active daemon.

---

## Docker Commands

### 1. Build Commands
- **Build Version 1:**
  ```bash
  docker build -t portfolio:v1 .
  ```
- **Build Version 2:**
  ```bash
  docker build -t portfolio:v2 .
  ```
- **Tag for Docker Hub:**
  ```bash
  docker tag portfolio:v2 shakkardaddy1/portfolio:v2
  docker tag portfolio:v1 shakkardaddy1/portfolio:v1
  ```

### 2. Run Commands
- **Run Version 1:**
  ```bash
  docker run -d -p 8080:80 --name portfolio-app portfolio:v1
  ```
- **Stop & Remove Old Container:**
  ```bash
  docker stop portfolio-app
  docker rm portfolio-app
  ```
- **Run Version 2:**
  ```bash
  docker run -d -p 8080:80 --name portfolio-app portfolio:v2
  ```

### Explanation of Flags:
- `-d`: Detached mode (runs container in the background).
- `-p 8080:80`: Port forwarding from host machine port `8080` to container port `80`.
- `--name portfolio-app`: Assigns a friendly, identifiable name to the running container.

---

## Docker Image & Version Details

| Image Name | Tag | Image ID | Size | Description |
| :--- | :--- | :--- | :--- | :--- |
| `portfolio` | `v1` | `55a7b052c5cd` | 102 MB (28.8 MB compressed) | Initial containerized resume application |
| `portfolio` | `v2` | `b5758de02a78` | 102 MB (28.8 MB compressed) | Updated version with UI & skill enhancements |
| `shakkardaddy1/portfolio` | `v1` | `55a7b052c5cd` | 102 MB | Registry tagged v1 image |
| `shakkardaddy1/portfolio` | `v2` | `b5758de02a78` | 102 MB | Registry tagged v2 image |

---

## Docker Hub Repository
- **Repository URL:** [https://hub.docker.com/r/shakkardaddy1/portfolio](https://hub.docker.com/r/shakkardaddy1/portfolio)
- **Repository Visibility:** Private
- **Pushed Tags:** `v1`, `v2`
- **Push Commands:**
  ```bash
  docker login
  docker push shakkardaddy1/portfolio:v2
  docker push shakkardaddy1/portfolio:v1
  ```

---

## Application URL
- **Local Browser URL:** [http://localhost:8080](http://localhost:8080)
- **Remote VM URL:** `http://<VM_IP_ADDRESS>:8080`

---

## Changes Made in Version v2
1. **Header Badge:** Added an accent green badge `v2.0` adjacent to the brand name `Akarsh.`.
2. **Skills Expansion:** Added `Docker` and `DevOps` skill pills into the Skills & Technologies section.
3. **Footer Update:** Updated footer branding to reflect containerization: `© 2026 Akarsh. Built with curiosity • v2.0 (Dockerized)`.

---

## VM Deployment Details (Question 3)

To deploy the Dockerized application on an independent Virtual Machine (e.g., Ubuntu/Debian on AWS EC2, Azure, Google Cloud, or VirtualBox):

### Step 1: Install Docker on the VM (if not already installed)
```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl enable --now docker
```

### Step 2: Authenticate to Docker Hub
Since the repository is Private, authentication is required on the VM:
```bash
docker login -u shakkardaddy1
# Enter password or Docker Hub Personal Access Token (PAT)
```

### Step 3: Pull the v2 Docker Image
```bash
docker pull shakkardaddy1/portfolio:v2
```

### Step 4: Run the Application Container
```bash
docker run -d -p 8080:80 --name portfolio-vm shakkardaddy1/portfolio:v2
```

### Step 5: Verify Deployment
- Verify container status:
  ```bash
  docker ps
  ```
- Check local response on VM:
  ```bash
  curl -I http://localhost:8080
  ```
- Access from client web browser using the VM's external IP:
  ```text
  http://<VM_EXTERNAL_IP>:8080
  ```
  *(Ensure inbound port 8080 is permitted in the VM firewall or Cloud Security Group).*

---

## Screenshots of the Application & Docker Workflow

### 1. Docker Build Output
![Docker Build](screenshots/docker-build.png)

### 2. Local Docker Images (`docker images`)
![Docker Images](screenshots/docker-images.png)

### 3. Running Container Status (`docker ps`)
![Docker Containers](screenshots/docker-ps.png)

### 4. Application Running in Browser (Version 1)
![Browser Version 1](screenshots/browser-v1.png)

### 5. Application Running in Browser (Version 2 with UI updates)
![Browser Version 2](screenshots/browser-v2.png)

### 6. Docker Hub Private Repository & Pushed Tags
![Docker Hub](screenshots/dockerhub.png)

---

## Complete Containerization and Deployment Process

1. **Host Independence & Base Image Selection:**
   A standard web application requires a runtime server. Instead of depending on host web servers (like Apache or IIS installed directly on Windows), Docker encapsulates the application inside a Linux container using `nginx:alpine`. This guarantees identical runtime behavior across Windows, macOS, and Linux.

2. **Image Layer Construction:**
   The `Dockerfile` defines immutable instructions. Nginx binaries form the base layer, and application assets (`index.html`, `style.css`) are copied into `/usr/share/nginx/html`. The resulting image is portable and compact (~28.8 MB compressed).

3. **Lifecycle & Port Mapping:**
   When running the container, port translation maps host port `8080` to container port `80`. The application serves requests isolated inside container namespaces.

4. **Iterative Redeployment (v1 -> v2):**
   When changes were introduced to the code, the image was rebuilt with tag `v2`. Docker safely stopped and removed the `v1` container before instantiating the `v2` container with zero downtime issues.

5. **Cloud Distribution via Docker Hub:**
   By tagging the image as `shakkardaddy1/portfolio:v2` and pushing to Docker Hub, the containerized application is decoupled from the developer machine, enabling seamless deployment to any remote VM or cloud cluster with a single `docker pull` command.
---

# Multi-VM Infrastructure & Observability Deployment Details

## 1. Cloud Architecture & Infrastructure as Code (Terraform)
- **Cloud Provider:** Amazon Web Services (AWS)
- **Region:** `ap-south-1` (Mumbai)
- **VPC ID:** `vpc-0cbdb3395a40f265c` (10.0.0.0/16)
- **Subnets:**
  - Subnet 1 (`10.0.1.0/24` in `ap-south-1a`): Houses VM 1 (Primary Web Server)
  - Subnet 2 (`10.0.2.0/24` in `ap-south-1b`): Houses VM 2 (Secondary Web Server + Observability Stack)
- **Security Group:** `portfolio-web-sg` (Permits SSH, HTTP, 8080, 3000, 5601, 8085)

---

## 2. Live Virtual Machine Endpoints (Different IPs)

| Service Name | Host / IP | Port | Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| **VM 1 Web Server** | `3.109.185.38` | `8080` | **ONLINE (HTTP 200)** | Primary Portfolio Frontend Web Server |
| **VM 2 Web Server** | `43.204.235.47` | `8080` | **ONLINE (HTTP 200)** | Secondary Replica Frontend (Different Public IP) |
| **Grafana Dashboard** | `43.204.235.47` | `3000` | **ONLINE** | Live Metrics Visualization (User: `admin` / Pass: `admin`) |
| **PrestaShop Store** | `43.204.235.47` | `8085` | **ONLINE** | Containerized e-commerce app with MySQL backend |
| **Kibana (ELK)** | `43.204.235.47` | `5601` | **ONLINE** | Centralized Elasticsearch Log Analyzer |
| **Prometheus Metrics**| `43.204.235.47` | `9090` | **ONLINE** | Time-series scraper collecting container health data |

---

## 3. Container Topology on VM 2
- `portfolio-web` (`shakkardaddy1/portfolio:v2` on `:8080`)
- `prestashop-container` (`prestashop/prestashop:latest` on `:8085`)
- `prestashop-mysql` (`mysql:5.7` on `:3306`)
- `grafana` (`grafana/grafana:latest` on `:3000`)
- `prometheus` (`prom/prometheus:latest` on `:9090`)
- `elasticsearch` (`elasticsearch:7.17.10` on `:9200`)
- `kibana` (`kibana:7.17.10` on `:5601`)


---

## 4. Web Resume Authentication & Security Architecture
- **OAuth 2.0 Provider:** GitHub OAuth API (Client ID + Secret handshake)
- **Multi-Factor Authentication (MFA):** TOTP RFC 6238 compliant via Speakeasy & dynamic QR Code rendering
- **Authenticator App Support:** Google Authenticator, Microsoft Authenticator, Authy
- **Session Layer:** Secure HTTP-only cookies with HMAC SHA-256 session signature

---

## 5. Razorpay Payment Gateway Integration
- **Integration Mode:** Dual-mode (Live Test Keys + Zero-configuration Sandbox fallback)
- **Supported Tiers:** ₹500 (Basic Support), ₹1000 (Standard Consultation), ₹2500 (Enterprise Architecture), plus Custom Amounts
- **Security:** Server-side HMAC SHA-256 order signature verification (`razorpay_order_id|razorpay_payment_id`) against `RAZORPAY_KEY_SECRET`
- **Endpoints:**
  - `POST /api/pay/order`: Generates Razorpay order ID
  - `POST /api/pay/verify`: Validates cryptographic payment signatures

---

## 6. Kubernetes Cluster Orchestration
- **Cluster Engines:** K3s (Lightweight Kubernetes v1.36) / Minikube v1.39
- **Manifests (`k8s/portfolio-k8s.yaml`):**
  - **Namespace:** `portfolio-system`
  - **Deployments:** `portfolio-frontend` (2 replicas), `portfolio-auth` (2 replicas)
  - **Services:** `frontend-service` (NodePort), `auth-service` (ClusterIP)
  - **Ingress Controller:** Traefik Ingress routing external traffic with SSL termination
  - **ConfigMaps & Secrets:** Base64-encoded environment secrets and Nginx reverse-proxy configuration

---

## 7. Agile Project Management & Jira Board
- **Methodology:** Scrum / Agile 2-week Sprint cycles
- **Total Story Points:** 90 SP (100% Completed across 6 Epics)
- **Epics Delivered:**
  1. `EPIC-1`: Enterprise Authentication & MFA Security (13 SP)
  2. `EPIC-2`: Razorpay Monetization & Payment Processing (15 SP)
  3. `EPIC-3`: Infrastructure as Code (Terraform Multi-VM AWS) (20 SP)
  4. `EPIC-4`: Container Orchestration (Kubernetes / K3s) (16 SP)
  5. `EPIC-5`: Enterprise Observability & ELK Centralized Logging (18 SP)
  6. `EPIC-6`: Custom Domain, Edge CDN & Production Delivery (8 SP)
