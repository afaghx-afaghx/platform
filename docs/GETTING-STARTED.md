# Getting Started

## Prerequisites
Use the versions declared by the repository's active runtime and package manifests. Do not invent local services that are not implemented.

## First steps
1. Clone the repository.
2. Read `AGENTS.md`.
3. Read `README.md` and the relevant architecture documents.
4. Inspect the current CI status before changing code.
5. Use an isolated branch.
6. Run the repository's documented validation commands for the area being changed.

## Architecture rule
Experience applications use the canonical API boundary and never connect directly to databases.
