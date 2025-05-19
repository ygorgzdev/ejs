const express = require('express');
const router = express.Router();
const { createProject, getAllProjects, getProjectById } = require('../controllers/projectController');
const { auth } = require('../middleware/auth');

router.post('/', auth, createProject);
router.get('/', getAllProjects);
router.get('/:id', getProjectById);

module.exports = router;