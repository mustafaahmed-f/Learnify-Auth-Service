import {
    checkAuth,
    checkRole,
    validationMiddleware,
} from '@mustafahmed1997/learnify-backend';
import { Router } from 'express';
import { submitRequestBodySchema } from './validations/submitRequest.validation.js';
import { submitRequest } from './controllers/submitRequest.js';
import { cancelRequestParamsSchema } from './validations/cancelRequest.validation.js';
import { cancelRequest } from './controllers/cancelRequest.js';
import { approveRequest } from './controllers/approveRequest.js';
import { editRequest } from './controllers/editRequest.js';
import { getMyRequests } from './controllers/getMyRequests.js';
import { getSingleRequest } from './controllers/getSingleRequest.js';
import { getAllRequests } from './controllers/getAllRequests.js';
import { rejectRequest } from './controllers/rejectRequest.js';
import {
    editRequestParamsSchema,
    editRequestBodySchema,
} from './validations/editRequest.validation.js';

const router = Router();

router.use(checkAuth);

//* CRUD operations by owner
router.post(
    '/',
    checkRole(['STUDENT'], { mode: 'Exact' }),
    validationMiddleware({ body: submitRequestBodySchema }),
    submitRequest
);
router.delete(
    '/:requestId',
    checkRole(['STUDENT'], { mode: 'Exact' }),
    validationMiddleware({ params: cancelRequestParamsSchema }),
    cancelRequest
);
router.patch(
    '/:requestId',
    checkRole(['STUDENT'], { mode: 'Exact' }),
    validationMiddleware({
        params: editRequestParamsSchema,
        body: editRequestBodySchema,
    }),
    editRequest
);

//* Get single request
router.get('/:requestId', getSingleRequest);

//* User get his requests
router.get('/me', getMyRequests);

//* Admin get all requests
router.get('/allRequests', checkRole(['ADMIN']), getAllRequests);

//* Admin approve/reject request
router.post('/approve/:requestId', checkRole(['ADMIN']), approveRequest);
router.post('/reject/:requestId', checkRole(['ADMIN']), rejectRequest);

export default router;
