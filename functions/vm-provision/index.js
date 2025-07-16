const { app } = require('@azure/functions');
const { ComputeManagementClient } = require('@azure/arm-compute');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const computeClient = new ComputeManagementClient(credential, subscriptionId);

app.http('vm-provision', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { sessionId, vmSize = 'Standard_B2s', region = 'eastus' } = await request.json();

            if (!sessionId) {
                return {
                    status: 400,
                    jsonBody: { error: 'Session ID is required' }
                };
            }

            const resourceGroupName = `syncdaw-${sessionId}`;
            const vmName = `syncdaw-vm-${sessionId}`;

            // VM configuration for DAW hosting
            const vmParameters = {
                location: region,
                hardwareProfile: {
                    vmSize: vmSize
                },
                storageProfile: {
                    imageReference: {
                        publisher: 'MicrosoftWindowsDesktop',
                        offer: 'Windows-10',
                        sku: '20h2-pro',
                        version: 'latest'
                    },
                    osDisk: {
                        createOption: 'FromImage',
                        diskSizeGB: 128
                    }
                },
                osProfile: {
                    computerName: vmName,
                    adminUsername: 'syncdawadmin',
                    adminPassword: generateSecurePassword(),
                    windowsConfiguration: {
                        enableAutomaticUpdates: false,
                        provisionVMAgent: true
                    }
                },
                networkProfile: {
                    networkInterfaces: [{
                        id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Network/networkInterfaces/${vmName}-nic`
                    }]
                }
            };

            // Create VM (simplified - in production, you'd also create network resources)
            const vmResult = await computeClient.virtualMachines.beginCreateOrUpdate(
                resourceGroupName,
                vmName,
                vmParameters
            );

            return {
                status: 202,
                jsonBody: {
                    vmId: vmName,
                    status: 'provisioning',
                    sessionId: sessionId,
                    region: region
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
        } catch (error) {
            context.log('Error provisioning VM:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to provision VM' }
            };
        }
    }
});

function generateSecurePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}