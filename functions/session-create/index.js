const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient(process.env.AZURE_COSMOSDB_CONNECTION_STRING);
const database = client.database(process.env.AZURE_COSMOSDB_DATABASE || 'syncdaw');
const container = database.container('sessions');

app.http('session-create', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { projectName, userId } = await request.json();

            if (!projectName || !userId) {
                return {
                    status: 400,
                    jsonBody: { error: 'Project name and user ID are required' }
                };
            }

            const sessionId = generateSessionId();
            const session = {
                id: sessionId,
                name: projectName,
                createdBy: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                participants: [userId],
                status: 'active',
                settings: {
                    maxParticipants: 10,
                    allowFileUpload: true,
                    allowChat: true,
                    autoSave: true
                }
            };

            const { resource } = await container.items.create(session);

            return {
                status: 201,
                jsonBody: resource,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
        } catch (error) {
            context.log('Error creating session:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to create session' }
            };
        }
    }
});

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}