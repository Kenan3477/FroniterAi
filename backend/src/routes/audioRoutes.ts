/**
 * Audio File Routes
 * 
 * API endpoints for audio file management
 */

import express from 'express';
import {
  audioUploadMiddleware,
  uploadAudioFile,
  downloadAudioFile,
  streamAudioFile,
  listAudioFiles,
  getAudioFileMetadata,
  updateAudioFile,
  deleteAudioFile
} from '../controllers/audioController';

const router = express.Router();

/**
 * POST /api/audio/upload
 * Upload a new audio file
 * 
 * Expects multipart/form-data with:
 * - audio: Audio file (required)
 * - displayName: Display name (required)
 * - type: File type (greeting, hold_music, announcement, etc.)
 * - description: Description (optional)
 * - tags: JSON array of tags (optional)
 * - duration: Duration in seconds (optional)
 */
router.post('/upload', audioUploadMiddleware, uploadAudioFile);

/**
 * GET /api/audio
 * List all audio files
 * 
 * Query params:
 * - type: Filter by type (greeting, hold_music, etc.)
 * - search: Search in display name, filename, description
 */
router.get('/', listAudioFiles);

/**
 * GET /api/audio/:id/metadata
 * Get audio file metadata (without binary data)
 */
router.get('/:id/metadata', getAudioFileMetadata);

/**
 * GET /api/audio/stream/:id
 * Stream audio file for playback (supports range requests)
 */
router.get('/stream/:id', streamAudioFile);

/**
 * GET /api/audio/:id
 * Download audio file
 */
router.get('/:id', downloadAudioFile);

/**
 * PATCH /api/audio/:id
 * Update audio file metadata
 * 
 * Body:
 * - displayName: New display name
 * - type: New type
 * - description: New description
 * - tags: New tags JSON array
 */
router.patch('/:id', updateAudioFile);

/**
 * DELETE /api/audio/:id
 * Delete an audio file
 * 
 * Will fail if file is being used by inbound numbers
 */
router.delete('/:id', deleteAudioFile);

export default router;
