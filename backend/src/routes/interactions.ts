import { Router } from 'express';

const router = Router();

// Basic interactions endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

export default router;