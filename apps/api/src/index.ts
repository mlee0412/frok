// near the top
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { usersRoutes } from './routes/users';
import { devicesRoutes } from './routes/devices';

const app = Fastify({ logger: true });

// CORS so the web app can call localhost:4000
await app.register(cors, { origin: true });

// health check (you already have /health)
app.get('/health', async () => ({ ok: true, name: '@frok/api' }));

// our new routes
await app.register(usersRoutes);
await app.register(devicesRoutes);

// start (you likely already have this)
const port = Number(process.env.PORT || 4000);
app.listen({ port, host: '0.0.0.0' });
