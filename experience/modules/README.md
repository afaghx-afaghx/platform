# Experience Modules

The Experience layer contains the controlled AFAGHX module entrypoints. The 17-entry registry is governed as one Experience surface; modules are not independent identity authorities.

## Module pattern
Each module should:
1. own presentation and user interaction;
2. consume explicit versioned API/contracts;
3. resolve authentication and authorization through AFX-CORE-backed API flows;
4. preserve tenant context;
5. must not own or reach persistence directly;
6. include focused tests and evidence.

Business rules and persistence belong to the appropriate DOMAIN or CORE boundary, not to an Experience module.
