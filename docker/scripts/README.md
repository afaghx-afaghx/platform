# Docker Helper Scripts

- start.sh: starts the local stack and builds verified application images.
- stop.sh: stops the local Compose project.
- reset.sh: stops the project and removes local named volumes; destructive.
- validate.sh: validates Docker Foundation files, checks credential placeholders, and parses Compose when Docker Compose is available.

These are local-development tools. They do not create production Kubernetes resources or alter application architecture.
