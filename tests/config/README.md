# Test Configuration

Owns only the test runner and test-environment defaults. It does not configure application runtime, production secrets, database schemas, or deployment.

Vitest is selected because this task explicitly establishes it as the preferred runner. Coverage uses V8 and is enabled for normal CI execution.
