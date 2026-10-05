import type { McpServer } from "skybridge/server";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { LexwareClient } from "../src/lexware/client.js";
import {
  registerDocumentDraftTools,
  registerDocumentFinalizeTools,
  registerDocumentReadTools,
} from "../src/tools/documents.js";

type Handler = (input: Record<string, unknown>) => Promise<unknown>;

type Captured = {
  handlers: Record<string, Handler>;
  schemas: Record<string, z.ZodRawShape>;
  descriptions: Record<string, string>;
};

function serverCapture(): { server: McpServer; captured: Captured } {
  const captured: Captured = { handlers: {}, schemas: {}, descriptions: {} };
  const server = {
    registerTool(
      cfg: { name: string; description?: string; inputSchema?: z.ZodRawShape },
      handler: Handler,
    ) {
      captured.handlers[cfg.name] = handler;
      captured.descriptions[cfg.name] = cfg.description ?? "";
      if (cfg.inputSchema) captured.schemas[cfg.name] = cfg.inputSchema;
      return server;
    },
  } as unknown as McpServer;
  return { server, captured };
}

function draftCapture(post: ReturnType<typeof vi.fn>) {
  const { server, captured } = serverCapture();
  registerDocumentDraftTools(server, { post } as unknown as LexwareClient);
  const invoke = (name: string, input: Record<string, unknown>) =>
    captured.handlers[name](z.object(captured.schemas[name]).parse(input) as Record<string, unknown>);
  return { ...captured, invoke };
}

function finalizeCapture(post: ReturnType<typeof vi.fn>) {
  const { server, captured } = serverCapture();
  registerDocumentFinalizeTools(server, { post } as unknown as LexwareClient);
  return captured;
}

function readCapture(getBinary: ReturnType<typeof vi.fn>) {
  const { server, captured } = serverCapture();
  registerDocumentReadTools(server, { getBinary } as unknown as LexwareClient, "https://app.test");
  return captured;
}

describe("dunning lifecycle follows the Lexware provider contract", () => {
  it("does not register create-finalized-dunning", () => {
    const tools = finalizeCapture(vi.fn());
    expect(tools.handlers).not.toHaveProperty("create-finalized-dunning");
    expect(tools.handlers).toHaveProperty("create-finalized-invoice");
  });

  it("requires precedingSalesVoucherId before dispatching a dunning create", async () => {
    const post = vi.fn(async () => ({ id: "dun-1", version: 0 }));
    const tools = draftCapture(post);

    await expect(tools.invoke("create-draft-dunning", {})).rejects.toThrow(
      /requires precedingSalesVoucherId/,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("pursues an existing invoice without any finalize query", async () => {
    const post = vi.fn(async () => ({ id: "dun-1", version: 0 }));
    const tools = draftCapture(post);

    const result = (await tools.invoke("create-draft-dunning", {
      precedingSalesVoucherId: "inv-1",
    })) as { structuredContent: Record<string, unknown> };

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      "/v1/dunnings",
      {},
      { precedingSalesVoucherId: "inv-1" },
    );
    expect(result.structuredContent.finalized).toBe(false);
    expect(tools.descriptions["create-draft-dunning"]).not.toContain(
      "create-finalized-dunning",
    );
  });

  it("rejects stale finalize intent locally with the dunning-specific reason", async () => {
    const post = vi.fn(async () => ({ id: "dun-1", version: 0 }));
    const tools = draftCapture(post);

    await expect(
      tools.invoke("create-draft-dunning", {
        precedingSalesVoucherId: "inv-1",
        finalize: true,
      }),
    ).rejects.toThrow(/always remain draft/);
    expect(post).not.toHaveBeenCalled();
  });

  it("describes and downloads the draft-lifecycle dunning PDF", async () => {
    const getBinary = vi.fn(async () => ({
      data: Buffer.from("%PDF-1.7"),
      contentType: "application/pdf",
    }));
    const tools = readCapture(getBinary);

    expect(tools.descriptions["render-dunning-pdf"]).not.toMatch(
      /must be FINALIZED|draft has no file/i,
    );
    expect(tools.descriptions["render-dunning-pdf"]).toMatch(
      /draft status.*does not require finalization/i,
    );
    expect(tools.descriptions["get-document-file"]).toMatch(
      /dunnings are the provider exception and remain draft/i,
    );

    const result = (await tools.handlers["render-dunning-pdf"]({
      id: "dun-1",
    })) as { structuredContent: Record<string, unknown> };

    expect(getBinary).toHaveBeenCalledWith(
      "/v1/dunnings/dun-1/file",
      "application/pdf",
    );
    expect(result.structuredContent).toMatchObject({
      resource: "dunnings",
      id: "dun-1",
      format: "pdf",
      mimeType: "application/pdf",
    });
  });
});
