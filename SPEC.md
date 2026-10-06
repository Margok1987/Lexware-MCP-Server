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

## UX Flows

### Read data
1. User expresses a Lexware read intent.
2. Assistant selects one current read tool.
3. Server returns structured native/normalized data or a file/resource result.
4. Assistant summarizes the verified result.

### Draft or mutable write
1. User expresses an allowed draft/master-data/bookkeeping write intent.
2. Assistant selects the exact write tool and supplies only its current schema.
3. Server validates and performs one bounded provider write.
4. Current Lexware state is read back when verification is required by the operation.

### Finalize / irreversible action
1. User explicitly requests a finalizing/irreversible effect.
2. Assistant selects a finalize-tier tool; draft tools never carry finalize compatibility fields.
3. Required confirmation/elicitation is applied by the finalize path.
4. The provider effect is returned and subsequently verified as required.

Dunnings are excluded from this flow because Lexware dunnings are not finalizable.

### File upload
1. User provides or identifies a file for a permitted Lexware upload.
2. Assistant uses direct upload or the upload-ticket flow according to the current operation.
3. Server returns the provider file/result identifier.
4. Follow-up bookkeeping operations use that current identifier where authorized.

## Tools and Views

This MCP server uses **tools only** for the current product surface; no custom view is required.

Tool names are current semantic actions. The active source does not retain obsolete per-document read wrappers or compatibility-only aliases. Generic document access is provided by `get-document` and `get-document-file`.
