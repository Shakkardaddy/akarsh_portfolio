variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "ap-south-1" # Mumbai (or change to us-east-1)
}

variable "instance_type" {
  description = "EC2 Instance Size"
  type        = string
  default     = "t3.small" # Free-tier eligible in ap-south-1 with 2GB RAM
}

variable "ubuntu_ami_id" {
  description = "Ubuntu 22.04 LTS AMI ID"
  type        = string
  default     = "ami-082a1ff88c78c6290" # Official Ubuntu 22.04 LTS AMI in ap-south-1
}

variable "ssh_key_name" {
  description = "Name of existing EC2 Key Pair for SSH"
  type        = string
  default     = "akarsh-portfolio-key"
}
