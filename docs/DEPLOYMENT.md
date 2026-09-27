# Deployment

Deployment is evidence-gated.

A deployment must have:
- a known release SHA;
- passing required CI and security checks;
- reviewed architecture boundaries;
- migration/rollback evidence when schema changes exist;
- secrets supplied through the approved secrets boundary;
- deployment and runtime evidence;
- explicit human approval.

Kubernetes, containers, gateway, observability, backup, and disaster-recovery configuration belong to Infrastructure and must not become business-truth owners.
