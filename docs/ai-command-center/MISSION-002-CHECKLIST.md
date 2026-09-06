# Operator Checklist

1. Merge only after all repository gates are GREEN.
2. Confirm `OPENAI_API_KEY` exists only as the GitHub Environment secret.
3. Ensure API credits are available before selecting `live=true`.
4. Run the live workflow.
5. Inspect the evidence artifact.
6. Require human review before merge.
