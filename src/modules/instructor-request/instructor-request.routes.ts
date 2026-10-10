import {
    checkAuth,
    checkRole,
    validationMiddleware,
} from '@mustafahmed1997/learnify-backend';
import { Router } from 'express';
import { submitRequestSchema } from './validations/submitRequest.validation.js';
import { submitRequest } from './controllers/submitRequest.js';
import { cancelRequestSchema } from './validations/cancelRequest.validation.js';
import { cancelRequest } from './controllers/cancelRequest.js';
import { approveRequest } from './controllers/approveRequest.js';
import { editRequest } from './controllers/editRequest.js';
import { getMyRequests } from './controllers/getMyRequests.js';
import { getSingleRequest } from './controllers/getSingleRequest.js';
import { getAllRequests } from './controllers/getAllRequests.js';
import { rejectRequest } from './controllers/rejectRequest.js';

const router = Router();

router.use(checkAuth);

router.post(
    '/',
    checkRole(['STUDENT'], { mode: 'Exact' }),
    validationMiddleware({ body: submitRequestSchema }),
    submitRequest
);
router.delete(
    '/:requestId',
    checkRole(['STUDENT'], { mode: 'Exact' }),
    validationMiddleware({ body: cancelRequestSchema }),
    cancelRequest
);
router.patch(
    '/:requestId',
    checkRole(['STUDENT'], { mode: 'Exact' }),
    editRequest
);

//* User get his requests
router.get('/me', checkRole(['STUDENT'], { mode: 'Exact' }), getMyRequests);

//* Get single request
router.get(
    '/:requestId',
    checkRole(['STUDENT', 'ADMIN'], { mode: 'Any' }),
    getSingleRequest
);

//* Admin get all requests
router.get('/allRequests', checkRole(['ADMIN']), getAllRequests);

//* Admin approve/reject request
router.post('/approve/:requestId', checkRole(['ADMIN']), approveRequest);
router.post('/reject/:requestId', checkRole(['ADMIN']), rejectRequest);

export default router;
