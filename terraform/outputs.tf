output "vm1_public_ip" {
  description = "Public IP of Web Server VM 1"
  value       = aws_instance.web_server_1.public_ip
}

output "vm1_web_url" {
  description = "URL for Portfolio Web Server 1"
  value       = "http://${aws_instance.web_server_1.public_ip}:8080"
}

output "vm2_public_ip" {
  description = "Public IP of Web Server VM 2"
  value       = aws_instance.web_server_2.public_ip
}

output "vm2_web_url" {
  description = "URL for Web Server VM 2"
  value       = "http://${aws_instance.web_server_2.public_ip}:8080"
}

output "grafana_url" {
  description = "Grafana Dashboard URL"
  value       = "http://${aws_instance.web_server_2.public_ip}:3000"
}

output "prestashop_url" {
  description = "PrestaShop Container URL"
  value       = "http://${aws_instance.web_server_2.public_ip}:8085"
}

output "kibana_elk_url" {
  description = "Kibana (ELK) Logs URL"
  value       = "http://${aws_instance.web_server_2.public_ip}:5601"
}
