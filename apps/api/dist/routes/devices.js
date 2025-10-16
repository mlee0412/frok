export async function devicesRoutes(app) {
    app.get('/devices', async () => {
        return {
            ok: true,
            devices: [
                { id: 'd_1', name: 'Living Room TV', type: 'media_player', online: true },
                { id: 'd_2', name: 'Hue Sync Box', type: 'light_sync', online: true },
                { id: 'd_3', name: 'RYSE Blinds', type: 'cover', online: false },
            ],
        };
    });
}
