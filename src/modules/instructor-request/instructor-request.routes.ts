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
import { getAllRequestsQuerySchema } from './validations/getAllRequests.validation.js';

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

//* Admin get all requests
router.get(
    '/all',
    checkRole(['ADMIN'], { mode: 'Exact' }),
    validationMiddleware({ query: getAllRequestsQuerySchema }),
    getAllRequests
);

//* User get his requests
router.get('/me', getMyRequests);

//* Get single request
router.get('/single/:requestId', getSingleRequest);

//* Admin approve/reject request
router.post('/approve/:requestId', checkRole(['ADMIN']), approveRequest);
router.post('/reject/:requestId', checkRole(['ADMIN']), rejectRequest);

export default router;
