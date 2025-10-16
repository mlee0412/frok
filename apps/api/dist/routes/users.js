export async function usersRoutes(app) {
    app.get('/users', async () => {
        return {
            ok: true,
            users: [
                { id: 'u_1', name: 'Minki', role: 'owner', email: 'minki@example.com' },
                { id: 'u_2', name: 'Manager Bot', role: 'agent', email: 'manager@frok.local' },
                { id: 'u_3', name: 'Support', role: 'staff', email: 'support@frok.local' },
            ],
        };
    });
}
