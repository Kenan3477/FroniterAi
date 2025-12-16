import { Router } from 'express';

const router = Router();

// Basic webhooks endpoint
router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook received'
  });
});

export default router;