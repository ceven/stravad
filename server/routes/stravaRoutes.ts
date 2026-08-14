import { Router, Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import * as controller from '../controllers/stravaController';

const router = Router();

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');

async function validateSupabaseAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const auth = req.headers.authorization;
		if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Authorization' });
		const token = auth.split(' ')[1];
		if (!SUPABASE_URL) return res.status(500).json({ error: 'Server not configured: SUPABASE_URL' });

		const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}` } });
		if (!resp.ok) return res.status(401).json({ error: 'Invalid token' });
		const data = await resp.json();
		const userId = data?.id as string | undefined;
		if (!userId) return res.status(401).json({ error: 'Invalid token payload' });

		// attach verified user id for downstream handlers
		(req as any).authUserId = userId;
		next();
	} catch (err) {
		console.error('Auth validation error', err);
		res.status(500).json({ error: 'Auth validation failed' });
	}
}

// require supabase authentication for all routes
router.use(validateSupabaseAuth);

router.post('/auth/exchange', controller.exchangeToken);
// update get to use validateSupabaseAuth
router.get('/athlete/activities', controller.getActivities);
router.get('/athlete', controller.getStravaAthlete);
router.delete('/athlete/disconnect', controller.disconnect);

export default router;
