#!/bin/bash
set -e

echo "=== 1. Updating packages & Installing Docker ==="
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu

echo "=== 2. Pulling & Deploying Portfolio Web Server Container on Port 8080 (Replica) ==="
sudo docker run -d --restart=always -p 8080:80 --name portfolio-web shakkardaddy1/portfolio:v2

echo "=== 3. Setting up PrestaShop, Grafana, and ELK Stack ==="
sudo mkdir -p /opt/stack
sudo chown -R ubuntu:ubuntu /opt/stack

cat << 'EOF' > /opt/stack/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'portfolio_web'
    static_configs:
      - targets: ['portfolio-web:80']
EOF

cat << 'EOF' > /opt/stack/docker-compose.yml
services:
  # PrestaShop Database
  prestashop-db:
    image: mysql:5.7
    container_name: prestashop-mysql
    environment:
      MYSQL_ROOT_PASSWORD: prestashop_root_pass
      MYSQL_DATABASE: prestashop
      MYSQL_USER: prestashop
      MYSQL_PASSWORD: prestashop_pass
    volumes:
      - prestashop_db_data:/var/lib/mysql
    networks:
      - stack-net
    restart: always

  # PrestaShop Container
  prestashop-app:
    image: prestashop/prestashop:latest
    container_name: prestashop-container
    ports:
      - "8085:80"
    environment:
      DB_SERVER: prestashop-db
      DB_USER: prestashop
      DB_PASSWD: prestashop_pass
      DB_NAME: prestashop
      PS_INSTALL_AUTO: 1
    depends_on:
      - prestashop-db
    networks:
      - stack-net
    restart: always

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports:
      - "9090:9090"
    networks:
      - stack-net
    restart: always

  # Grafana Dashboard
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - stack-net
    restart: always

  # ELK Stack: Elasticsearch
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.17.10
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data
    networks:
      - stack-net
    restart: always

  # ELK Stack: Kibana
  kibana:
    image: docker.elastic.co/kibana/kibana:7.17.10
    container_name: kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - stack-net
    restart: always

networks:
  stack-net:
    driver: bridge

volumes:
  prestashop_db_data:
  grafana_data:
  es_data:
EOF

cd /opt/stack
sudo docker compose up -d

echo "=== VM 2 DEPLOYMENT COMPLETE ==="
