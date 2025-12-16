import { Router } from 'express';
import { startFlowExecution, continueFlowExecution, handleIVRInput } from '../controllers/flowExecution';

const router = Router();

/**
 * @swagger
 * /api/flow-execution/start:
 *   post:
 *     summary: Start a new flow execution
 *     description: Initiates a flow execution for an inbound call or trigger
 *     tags:
 *       - Flow Execution
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flowId:
 *                 type: string
 *                 description: ID of the flow to execute
 *               callerId:
 *                 type: string
 *                 description: Caller ID (optional)
 *               cli:
 *                 type: string
 *                 description: CLI/phone number
 *               context:
 *                 type: object
 *                 description: Additional context data
 *             required:
 *               - flowId
 *     responses:
 *       200:
 *         description: Flow execution started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 executionId:
 *                   type: string
 *                 result:
 *                   type: object
 *       400:
 *         description: Invalid request or validation error
 *       404:
 *         description: Flow not found
 *       500:
 *         description: Internal server error
 */
router.post('/start', startFlowExecution);

/**
 * @swagger
 * /api/flow-execution/step:
 *   post:
 *     summary: Continue flow execution with user input
 *     description: Continues an existing flow execution with new input/context
 *     tags:
 *       - Flow Execution
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               executionId:
 *                 type: string
 *                 description: ID of the execution to continue
 *               nodeId:
 *                 type: string
 *                 description: Current node ID
 *               input:
 *                 type: object
 *                 description: User input or context data
 *             required:
 *               - executionId
 *               - nodeId
 *     responses:
 *       200:
 *         description: Flow execution continued successfully
 *       400:
 *         description: Invalid request or validation error
 *       404:
 *         description: Execution or node not found
 *       500:
 *         description: Internal server error
 */
router.post('/step', continueFlowExecution);

/**
 * @swagger
 * /api/flow-execution/ivr:
 *   post:
 *     summary: Handle IVR digit input
 *     description: Processes IVR digit input and continues flow execution
 *     tags:
 *       - Flow Execution
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               executionId:
 *                 type: string
 *                 description: ID of the execution
 *               digit:
 *                 type: string
 *                 description: Digit pressed (1-4)
 *             required:
 *               - executionId
 *               - digit
 *     responses:
 *       200:
 *         description: IVR input processed successfully
 *       400:
 *         description: Invalid digit or no path found
 *       404:
 *         description: Execution not found
 *       500:
 *         description: Internal server error
 */
router.post('/ivr', handleIVRInput);

export default router;