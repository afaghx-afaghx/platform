# AFAGHX AI Gateway

The gateway is the only runtime boundary for AI providers.

- `MockProvider`: deterministic offline validation.
- `OpenAIProvider`: production OpenAI Responses API boundary.
- Provider policy controls allowed modes, network access, and credit requirements.
- Agents never receive merge authority.
