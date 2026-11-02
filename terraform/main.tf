terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Custom VPC
resource "aws_vpc" "portfolio_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "portfolio-vpc"
  }
}

# 2. Internet Gateway
resource "aws_internet_gateway" "portfolio_igw" {
  vpc_id = aws_vpc.portfolio_vpc.id

  tags = {
    Name = "portfolio-igw"
  }
}

# 3. Public Subnet 1 (VM 1 - Web Server 1)
resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.portfolio_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "portfolio-subnet-1"
  }
}

# 4. Public Subnet 2 (VM 2 - Web Server 2)
resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.portfolio_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "portfolio-subnet-2"
  }
}

# 5. Route Table & Associations
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.portfolio_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.portfolio_igw.id
  }

  tags = {
    Name = "portfolio-public-rt"
  }
}

resource "aws_route_table_association" "rta_1" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "rta_2" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_rt.id
}

# 6. Security Group for Web Servers
resource "aws_security_group" "web_sg" {
  name        = "portfolio-web-sg"
  description = "Allow HTTP, SSH, and Monitoring traffic"
  vpc_id      = aws_vpc.portfolio_vpc.id

  # SSH
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Node.js Auth Backend API
  ingress {
    description = "Node.js Auth API"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Portfolio alternate port
  ingress {
    description = "Custom Web App Port"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Prometheus Metrics
  ingress {
    description = "Prometheus Metrics"
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Grafana
  ingress {
    description = "Grafana Dashboard"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Kibana (ELK)
  ingress {
    description = "Kibana Dashboard"
    from_port   = 5601
    to_port     = 5601
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # PrestaShop
  ingress {
    description = "PrestaShop e-commerce"
    from_port   = 8085
    to_port     = 8085
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "portfolio-web-sg"
  }
}

# 7. VM 1: Primary Web Server (Frontend + Auth Server)
resource "aws_instance" "web_server_1" {
  ami           = var.ubuntu_ami_id
  instance_type = var.instance_type
  key_name      = var.ssh_key_name

  subnet_id              = aws_subnet.public_subnet_1.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "portfolio-web-vm1"
    Role = "webserver-primary"
  }
}

# 8. VM 2: Secondary Web Server (Replica with Diff IP / PrestaShop / ELK)
resource "aws_instance" "web_server_2" {
  ami           = var.ubuntu_ami_id
  instance_type = var.instance_type
  key_name      = var.ssh_key_name

  subnet_id              = aws_subnet.public_subnet_2.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]

  root_block_device {
    volume_size = 30 # 30 GB Free Tier eligible disk
    volume_type = "gp3"
  }

  tags = {
    Name = "portfolio-web-vm2"
    Role = "webserver-secondary"
  }
}
