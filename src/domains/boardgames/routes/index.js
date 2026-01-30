/**
 * Boardgames Routes Index
 * 
 * Aggregates all board game provider routes.
 * 
 * @module domains/boardgames/routes
 */

import express from 'express';
import bggRoutes from './bgg.routes.js';

const router = express.Router();

// BoardGameGeek routes
router.use('/bgg', bggRoutes);

export default router;
