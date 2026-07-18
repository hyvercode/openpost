import { Router } from 'express';
import { CollectionController } from '../controllers/collection.controller';

const router = Router();
const collectionController = new CollectionController();

router.get('/:workspaceId', collectionController.getCollectionsByWorkspace);
router.post('/', collectionController.createCollection);
router.put('/:id', collectionController.updateCollection);
router.delete('/:id', collectionController.deleteCollection);

export default router;
