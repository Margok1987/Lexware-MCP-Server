# Lexware Office MCP Server — Current Product Spec

## Value Proposition

Provide bounded conversational access to the Lexware Office API through deterministic MCP tools.

**Target user:** an authenticated operator using an MCP-capable assistant such as ChatGPT or Claude.

**Core actions:**
- read Lexware business/accounting data and document files;
- create non-finalized drafts and bounded mutable master/accounting data where enabled;
- perform explicitly gated irreversible/finalizing operations only through the finalize tier.

## Why LLM

**Conversational win:** the user can express business intent in normal language while the assistant selects the exact bounded technical operation.

**LLM adds:** intent interpretation, mapping business requests to the correct tool and assembling validated inputs.

**What the LLM lacks:** Lexware credentials, native runtime state and provider execution. Those remain in the MCP server and Lexware API.

## UI Overview

This is a tool-first MCP server with no required custom view.

- **First view:** the assistant conversation.
- **Interaction:** the assistant invokes one exact registered MCP tool.
- **End state:** the tool returns native/normalized data or a bounded effect that can be verified through Lexware readback.
- File/upload helpers may return links or embedded resources where the operation requires them.

## Product Context

- **Provider:** Lexware Office API.
- **Server:** Skybridge-based remote HTTP MCP server.
- **Authentication:** OAuth 2.1 or static bearer token.
- **Capability tiers:** read; drafts/writes; finalize/irreversible; separately opt-in URL upload.
- **Current fork:** `Margok1987/Lexware-MCP-Server`, upstream `marselsel/Lexware-MCP-Server`.
- **Runtime safety:** non-idempotent ambiguous writes are not blindly retried; finalization remains a separate gated tool family.

## Current Surface Rules

- Document reads use the generic `get-document` and `get-document-file` operations rather than per-document read wrappers.
- Draft tools expose only draft semantics. Finalization is not represented as a compatibility field on a draft tool.
- Dunning creation requires an existing preceding invoice and remains draft-only in Lexware; no finalized-dunning operation exists.
- Tool registration is determined by the current capability tiers. Disabled capabilities are not advertised.
- Current source and runtime behavior are authoritative; obsolete aliases and compatibility-only names are not retained in the active surface.
