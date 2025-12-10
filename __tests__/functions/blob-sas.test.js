jest.mock("@azure/storage-blob", () => {
  return {
    BlobServiceClient: jest.fn().mockImplementation(() => ({
      getUserDelegationKey: jest.fn(async () => ({
        signedOid: "x",
        signedTid: "y",
      })),
    })),
    generateBlobSASQueryParameters: jest.fn(() => ({
      toString: () => "sv=2023-01-01&sig=abc",
    })),
    BlobSASPermissions: { parse: jest.fn(() => ({ toString: () => "rl" })) },
  };
});

jest.mock("@azure/functions", () => ({ app: { http: jest.fn() } }), {
  virtual: true,
});
jest.mock("@azure/identity", () => ({ DefaultAzureCredential: jest.fn() }), {
  virtual: true,
});

const { handler } = require("../../functions/blob-sas/index.js");

describe("blob-sas function", () => {
  const context = { log: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns sasUrl and metadata", async () => {
    const req = {
      json: async () => ({
        container: "c",
        permissions: "r",
        ttlSeconds: 600,
        userId: "u1",
      }),
    };
    const res = await handler(req, context);
    expect(res.status).toBe(200);
    expect(res.jsonBody.sasUrl).toContain(
      "https://acct.blob.core.windows.net/c?"
    );
    expect(res.jsonBody.permissions).toBe("r");
    expect(context.log).toHaveBeenCalled();
  });

  it("fails when missing container/account", async () => {
    delete process.env.AZURE_STORAGE_ACCOUNT;
    const req = { json: async () => ({}) };
    const res = await handler(req, context);
    expect(res.status).toBe(400);
  });
});
process.env.AZURE_STORAGE_ACCOUNT = "acct";
