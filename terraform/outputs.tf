output "ner_app_url" {
  value       = "http://localhost:5174"
  description = "URL to access the NER React app"
}

output "ner_api_url" {
  value       = "http://localhost:5051"
  description = "URL to access the NER server API"
}

output "ner_ai_service_url" {
  value       = "http://localhost:8001/health"
  description = "URL for AI service health check"
}

output "container_names" {
  value = [
    docker_container.mongo.name,
    docker_container.ai_service.name,
    docker_container.server.name,
    docker_container.client.name
  ]
  description = "Names of all NER containers managed by Terraform"
}
