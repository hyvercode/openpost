import { Router } from 'express';
import { CollectionController } from '../controllers/collection.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
const collectionController = new CollectionController();

// All data routes require authentication. Public sharing is handled
// inside getSharedCollection (visibility check), not by exposing routes.
router.use(requireAuth);

router.get('/shared/:id', collectionController.getSharedCollection);
router.get('/:workspaceId', collectionController.getCollectionsByWorkspace);
router.post('/', collectionController.createCollection);
router.put('/:id', collectionController.updateCollection);
router.delete('/:id', collectionController.deleteCollection);

export default router;
