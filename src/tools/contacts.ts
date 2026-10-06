import type { McpServer } from "skybridge/server";
import { z } from "zod";
import type { LexwareClient } from "../lexware/client.js";
import {
  additionalFieldsParam,
  contactInputShape,
  contactUpdateShape,
  mergeBody,
  versionParam,
} from "./schemas.js";
import { DESTRUCTIVE, RO, WRITE, deepMergePatch, mergeAddresses, text } from "./shared.js";

/** Enforce Lexware's buyerReference/vendorNumberAtCustomer pair after all merges. */
function validateContactXRechnung(body: Record<string, unknown>): void {
  const raw = body.xRechnung;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const xRechnung = raw as Record<string, unknown>;
  const buyerReference = xRechnung.buyerReference;
  if (typeof buyerReference !== "string" || buyerReference === "") return;
  if (typeof xRechnung.vendorNumberAtCustomer !== "string" || xRechnung.vendorNumberAtCustomer.trim() === "") {
    throw new Error("XRechnung contact requires vendorNumberAtCustomer when buyerReference is set.");
  }
}

/** Read tools for contacts. Always registered. */
export function registerContactReadTools(server: McpServer, client: LexwareClient): void {
  // TEMPORARY CONNECTOR-REFRESH PROBE: list-contacts intentionally withdrawn.
  // Owner-approved diagnostic on 2026-10-06; restore immediately after client catalog refresh.

  server.registerTool(
    {
      name: "get-contact",
      title: "Get contact",
      description: "Get a single contact by id.",
      inputSchema: { id: z.string() },
      annotations: RO,
    },
    async ({ id }) => {
      const contact = await client.get<Record<string, unknown>>(`/v1/contacts/${encodeURIComponent(id)}`);
      return { structuredContent: contact, content: text(`Contact ${id} retrieved.`) };
    },
  );
}

/** Write tools: create/update a contact. Registered only when the drafts tier is enabled. */
export function registerContactDraftTools(server: McpServer, client: LexwareClient): void {
  server.registerTool(
    {
      name: "create-contact",
      title: "Create contact",
      description:
        "Create a new contact (customer and/or vendor). Provide roles plus either a person (lastName required) or a company (name required). " +
        "For German public-authority customers, xRechnung accepts buyerReference (Leitweg-ID) together with vendorNumberAtCustomer.",
      inputSchema: { ...contactInputShape, additionalFields: additionalFieldsParam },
      annotations: WRITE,
    },
    async ({ additionalFields, ...input }) => {
      if (!input.person && !input.company) {
        throw new Error("Provide either a person (with lastName) or a company (with name).");
      }
      // `version` must be 0 when creating.
      const body = { version: 0, ...mergeBody(input, additionalFields) };
      validateContactXRechnung(body);
      const created = await client.post<{ id: string }>("/v1/contacts", body);
      return { structuredContent: created, content: text(`Created contact ${created.id}.`) };
    },
  );

  server.registerTool(
    {
      name: "update-contact",
      title: "Update contact",
      description:
        "Update a contact. Read-modify-write: the current contact is fetched and your fields are merged over it, " +
        "so existing addresses, emailAddresses and roles are preserved — lexoffice PUT otherwise replaces the whole " +
        "contact. Nested objects like `company` and `xRechnung` are merged, so you can set just company.vatRegistrationId " +
        "or change only buyerReference while preserving the existing vendorNumberAtCustomer. A single address field like " +
        "addresses.billing[0].countryCode is also merged into the existing address (street/zip/city are kept). Pass " +
        "`version` for optimistic locking; omit to use the latest.",
      inputSchema: {
        id: z.string(),
        version: versionParam("get-contact"),
        ...contactUpdateShape,
      },
      annotations: DESTRUCTIVE,
    },
    async ({ id, version, ...fields }) => {
      // Read-modify-write: load the current contact and merge the caller's fields over
      // it, so omitted addresses/emailAddresses/roles aren't wiped by the full PUT.
      const current = await client.get<Record<string, unknown>>(`/v1/contacts/${encodeURIComponent(id)}`);
      const { addresses: addressPatch, ...rest } = fields;
      const body = deepMergePatch(current, {
        ...rest,
        version: version ?? (current.version as number),
      });
      // Addresses merge by index — deepMergePatch would replace the billing array
      // wholesale, so a partial billing[0] (e.g. just countryCode) must keep street/zip/city.
      if (addressPatch !== undefined) {
        body.addresses = mergeAddresses(current.addresses, addressPatch);
      }
      validateContactXRechnung(body);
      const updated = await client.request<{ id: string; version: number }>(
        "PUT",
        `/v1/contacts/${encodeURIComponent(id)}`,
        { body, idempotent: false },
      );
      return {
        structuredContent: updated,
        content: text(`Updated contact ${id} (now version ${updated.version}).`),
      };
    },
  );
}
