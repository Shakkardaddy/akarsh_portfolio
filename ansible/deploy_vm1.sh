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

echo "=== 2. Pulling & Deploying Portfolio Web Server Container on Port 8080 ==="
sudo docker run -d --restart=always -p 8080:80 --name portfolio-web shakkardaddy1/portfolio:v2

echo "=== VM 1 DEPLOYMENT COMPLETE ==="
