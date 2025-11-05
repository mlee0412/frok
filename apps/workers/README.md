# @frok/workers

Background workers and job processors for the FROK platform.

## Features

- **Job Queue Processing** - Async task execution
- **Scheduled Tasks** - Cron-based scheduling
- **Email Workers** - Send transactional emails
- **Data Processing** - Heavy computation offloading
- **Webhook Handlers** - Process external webhooks

## Development

```bash
# Start workers
pnpm -F @frok/workers dev

# Build workers
pnpm -F @frok/workers build

# Type check
pnpm -F @frok/workers typecheck
```

## Worker Types

### Email Workers
- `sendWelcomeEmail` - Send welcome email to new users
- `sendPasswordReset` - Send password reset emails
- `sendNotifications` - Send notification emails

### Data Processing Workers
- `processAnalytics` - Process analytics data
- `generateReports` - Generate scheduled reports
- `cleanupOldData` - Delete expired data

### Webhook Workers
- `processStripeWebhook` - Handle Stripe events
- `processGitHubWebhook` - Handle GitHub events

## Job Queue

Workers use a job queue (e.g., BullMQ) for reliable processing:

```typescript
import { addJob } from '@frok/workers';

// Add job to queue
await addJob('sendEmail', {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Hello...',
});
```

## Scheduling

Scheduled tasks are defined in `src/schedules/`:

```typescript
// Run every day at midnight
schedule('0 0 * * *', async () => {
  await cleanupOldData();
});
```

## Configuration

Environment variables:

```bash
# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# Email (SendGrid, Resend, etc.)
EMAIL_API_KEY=

# Worker settings
WORKER_CONCURRENCY=5
WORKER_MAX_RETRIES=3
```

## Monitoring

Workers expose metrics at `/metrics` endpoint:

- Job completion rate
- Processing time
- Error rate
- Queue size

## See Also

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Node-cron Documentation](https://github.com/node-cron/node-cron)
