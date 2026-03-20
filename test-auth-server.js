const express = require('express');
const cors = require('cors');

// Import the auth routes directly
const authRoutes = require('./backend/src/routes/auth').default;

const app = express();
const port = 3002; // Different port to avoid conflicts

app.use(cors());
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test server is working' });
});

// Register auth routes
app.use('/api/auth', authRoutes);

// List all registered routes
app.get('/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(function(middleware) {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        method: Object.keys(middleware.route.methods)[0]
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(function(handler) {
        if (handler.route) {
          routes.push({
            path: middleware.regexp.source.replace('\\/?$', '') + handler.route.path,
            method: Object.keys(handler.route.methods)[0]
          });
        }
      });
    }
  });
  res.json({ routes });
});

app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
  console.log(`Test routes at: http://localhost:${port}/routes`);
});