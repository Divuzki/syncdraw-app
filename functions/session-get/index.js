const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient(process.env.AZURE_COSMOSDB_CONNECTION_STRING);
const database = client.database(process.env.AZURE_COSMOSDB_DATABASE || 'syncdaw');
const container = database.container('sessions');

app.http('session-get', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'session-get/{sessionId}',
    handler: async (request, context) => {
        try {
            const sessionId = request.params.sessionId;

            if (!sessionId) {
                return {
                    status: 400,
                    jsonBody: { error: 'Session ID is required' }
                };
            }

            const { resource } = await container.item(sessionId, sessionId).read();

            if (!resource) {
                return {
                    status: 404,
                    jsonBody: { error: 'Session not found' }
                };
            }

            return {
                status: 200,
                jsonBody: resource,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
        } catch (error) {
            context.log('Error fetching session:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to fetch session' }
            };
        }
    }
});