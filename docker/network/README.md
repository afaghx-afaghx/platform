# Docker Network Boundary

Compose services communicate on the private Compose network by service name.

External access is limited to explicitly published development/test ports. No frontend or browser component should receive direct database credentials or bypass the AFAGHX API boundary.

Production ingress, segmentation, WAF, load balancing, and network policy belong to infrastructure/.
