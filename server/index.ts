// server/index.ts
import express from 'express';
import cors from 'cors';
import stravaRouter from './routes/stravaRoutes';

const app = express();
app.use(cors());
app.use(express.json());

// mount strava routes under /v1/strava
app.use('/v1/stravad', stravaRouter);

// Route inspector for convenience
app.get('/v1/routes', (req, res) => {
  const routes: { method: string; path: string }[] = [];

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods);
      methods.forEach((method) => {
        if (typeof middleware.route.path === 'string' && middleware.route.path.startsWith('/')) {
          routes.push({ method: method.toUpperCase(), path: middleware.route.path });
        }
      });
    }
  });

  res.json(routes.filter((r) => r.path.startsWith('/v1')));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));