/**
 * Media Domain - Routes principales
 * 
 * Monte les sous-routes pour chaque provider media
 */

import { Router } from 'express';
import tmdbRoutes from './routes/tmdb.routes.js';
import tvdbRoutes from './routes/tvdb.routes.js';

const router = Router();

// Montage des sous-routes
router.use('/tmdb', tmdbRoutes);
router.use('/tvdb', tvdbRoutes);

export { router };
