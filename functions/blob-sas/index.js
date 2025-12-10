const { app } = require("@azure/functions");
const {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

const credential = new DefaultAzureCredential();

async function handler(request, context) {
  try {
    const body = await request.json();
    const container = body.container;
    const pathPrefix = body.pathPrefix || "";
    const permissionsInput = body.permissions || "r";
    const ttlSeconds = body.ttlSeconds || 900;
    const userId = body.userId || "unknown";

    const accountName =
      process.env.AZURE_STORAGE_ACCOUNT ||
      process.env.VITE_AZURE_STORAGE_ACCOUNT;
    if (!accountName || !container) {
      return {
        status: 400,
        jsonBody: { error: "Missing storage account or container" },
      };
    }

    const now = new Date();
    const expires = new Date(now.getTime() + ttlSeconds * 1000);

    const serviceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential
    );
    const delegationKey = await serviceClient.getUserDelegationKey(
      now,
      expires
    );

    const perms =
      permissionsInput === "rwd"
        ? BlobSASPermissions.parse("rwdl")
        : permissionsInput === "rw"
        ? BlobSASPermissions.parse("rw")
        : BlobSASPermissions.parse("rl");

    const sas = generateBlobSASQueryParameters(
      {
        containerName: container,
        permissions: perms.toString(),
        startsOn: now,
        expiresOn: expires,
      },
      delegationKey,
      accountName
    ).toString();

    const sasUrl = `https://${accountName}.blob.core.windows.net/${container}?${sas}`;

    context.log(
      JSON.stringify({
        event: "blob_sas_issued",
        userId,
        container,
        pathPrefix,
        permissions: permissionsInput,
        ttlSeconds,
      })
    );

    return {
      status: 200,
      jsonBody: {
        sasUrl,
        container,
        pathPrefix,
        permissions: permissionsInput,
        expiresAt: expires.toISOString(),
      },
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    };
  } catch (error) {
    context.log(
      JSON.stringify({
        event: "blob_sas_error",
        error: error && error.message ? error.message : "unknown",
      })
    );
    return { status: 500, jsonBody: { error: "Failed to generate SAS" } };
  }
}

app.http("blob-sas", { methods: ["POST"], authLevel: "anonymous", handler });

module.exports = { handler };
