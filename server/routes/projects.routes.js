// ==========================================
// routes/projects.routes.js
// Client Project Management routes (Task 11).
// All paths are absolute (start with /api).
// ==========================================

const express = require('express');

const Project = require('../models/Project');
const User = require('../models/User');
const { authenticateToken, authorize } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/permissions');

const router = express.Router();

// ==========================================
// GET /api/projects/stats  (Admin only)
// Get project statistics for dashboard.
// NOTE: This route MUST come before /api/projects/:id
// to avoid being matched as an id.
// ==========================================
router.get(
    '/api/projects/stats',
    authenticateToken,
    authorize(PERMISSIONS.PROJECTS_READ),
    async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied.'
                });
            }

            const total = await Project.countDocuments();
            const notStarted = await Project.countDocuments({ status: 'Not Started' });
            const inProgress = await Project.countDocuments({ status: 'In Progress' });
            const completed = await Project.countDocuments({ status: 'Completed' });
            const onHold = await Project.countDocuments({ status: 'On Hold' });

            return res.json({
                success: true,
                data: { total, notStarted, inProgress, completed, onHold }
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// GET /api/projects  (Authenticated users)
// List projects based on role:
//   - admin       : all projects
//   - team_member : projects where assigned
//   - customer    : projects where they are the client
// ==========================================
router.get(
    '/api/projects',
    authenticateToken,
    authorize(PERMISSIONS.PROJECTS_READ),
    async (req, res) => {
        try {
            let filter = {};

            if (req.user.role === 'admin') {
                filter = {};
            } else if (req.user.role === 'team_member') {
                filter = { assignedMembers: req.user.id };
            } else if (req.user.role === 'customer') {
                filter = { client: req.user.id };
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied.'
                });
            }

            const projects = await Project.find(filter)
                .populate('client', 'name email')
                .populate('assignedMembers', 'name email')
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 });

            return res.json({ success: true, data: projects });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// GET /api/projects/:id  (Authenticated users)
// Get a single project (with access control).
// ==========================================
router.get(
    '/api/projects/:id',
    authenticateToken,
    authorize(PERMISSIONS.PROJECTS_READ),
    async (req, res) => {
        try {
            const project = await Project.findById(req.params.id)
                .populate('client', 'name email')
                .populate('assignedMembers', 'name email')
                .populate('createdBy', 'name email');

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found.'
                });
            }

            if (req.user.role !== 'admin') {
                const isAssigned = project.assignedMembers.some(
                    m => m._id.toString() === req.user.id
                );
                const isClient = project.client._id.toString() === req.user.id;
                if (!isAssigned && !isClient) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. You are not assigned to this project.'
                    });
                }
            }

            return res.json({ success: true, data: project });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// POST /api/projects  (Admin only)
// Create a new project.
// ==========================================
router.post(
    '/api/projects',
    authenticateToken,
    authorize(PERMISSIONS.PROJECTS_CREATE),
    async (req, res) => {
        try {
            const { name, description, client, assignedMembers } = req.body;

            if (!name?.trim() || !description?.trim() || !client) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, description, and client are required.'
                });
            }

            const clientUser = await User.findById(client);
            if (!clientUser || clientUser.role !== 'customer') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid client. Must be a registered customer.'
                });
            }

            let validMembers = [];
            if (Array.isArray(assignedMembers) && assignedMembers.length > 0) {
                const members = await User.find({
                    _id: { $in: assignedMembers },
                    role: 'team_member'
                });
                validMembers = members.map(m => m._id);
            }

            const project = await Project.create({
                name: name.trim(),
                description: description.trim(),
                client,
                assignedMembers: validMembers,
                createdBy: req.user.id
            });

            const populated = await Project.findById(project._id)
                .populate('client', 'name email')
                .populate('assignedMembers', 'name email')
                .populate('createdBy', 'name email');

            return res.status(201).json({
                success: true,
                message: 'Project created successfully!',
                data: populated
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// PUT /api/projects/:id  (Admin or assigned team member)
// Update a project's name and description.
// ==========================================
router.put(
    '/api/projects/:id',
    authenticateToken,
    authorize(PERMISSIONS.PROJECTS_UPDATE),
    async (req, res) => {
        try {
            const project = await Project.findById(req.params.id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found.'
                });
            }

            if (req.user.role !== 'admin') {
                const isAssigned = project.assignedMembers.some(
                    m => m.toString() === req.user.id
                );
                if (!isAssigned) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. You are not assigned to this project.'
                    });
                }
            }

            const { name, description } = req.body;
            if (name?.trim()) project.name = name.trim();
            if (description?.trim()) project.description = description.trim();
            project.updatedAt = Date.now();

            await project.save();

            const populated = await Project.findById(project._id)
                .populate('client', 'name email')
                .populate('assignedMembers', 'name email')
                .populate('createdBy', 'name email');

            return res.json({
                success: true,
                message: 'Project updated successfully!',
                data: populated
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// PUT /api/projects/:id/status  (Admin or assigned team member)
// Update a project's status.
// ==========================================
router.put(
    '/api/projects/:id/status',
    authenticateToken,
    authorize(PERMISSIONS.PROJECTS_UPDATE),
    async (req, res) => {
        try {
            const { status } = req.body;
            const validStatuses = ['Not Started', 'In Progress', 'Completed', 'On Hold'];

            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or missing status value.'
                });
            }

            const project = await Project.findById(req.params.id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found.'
                });
            }

            if (req.user.role !== 'admin') {
                const isAssigned = project.assignedMembers.some(
                    m => m.toString() === req.user.id
                );
                if (!isAssigned) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. You are not assigned to this project.'
                    });
                }
            }

            project.status = status;
            project.updatedAt = Date.now();
            await project.save();

            const populated = await Project.findById(project._id)
                .populate('client', 'name email')
                .populate('assignedMembers', 'name email')
                .populate('createdBy', 'name email');

            return res.json({
                success: true,
                message: 'Project status updated successfully!',
                data: populated
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// PUT /api/projects/:id/assign  (Admin only)
// Assign team members to a project.
// ==========================================
router.put(
    '/api/projects/:id/assign',
    authenticateToken,
    authorize(PERMISSIONS.PROJECTS_ASSIGN),
    async (req, res) => {
        try {
            const { assignedMembers } = req.body;

            if (!Array.isArray(assignedMembers)) {
                return res.status(400).json({
                    success: false,
                    message: 'assignedMembers must be an array of user IDs.'
                });
            }

            const project = await Project.findById(req.params.id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found.'
                });
            }

            const members = await User.find({
                _id: { $in: assignedMembers },
                role: 'team_member'
            });
            if (members.length !== assignedMembers.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more users are not valid team members.'
                });
            }

            project.assignedMembers = members.map(m => m._id);
            project.updatedAt = Date.now();
            await project.save();

            const populated = await Project.findById(project._id)
                .populate('client', 'name email')
                .populate('assignedMembers', 'name email')
                .populate('createdBy', 'name email');

            return res.json({
                success: true,
                message: 'Team members assigned successfully!',
                data: populated
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// DELETE /api/projects/:id  (Admin only)
// Delete a project.
// ==========================================
router.delete(
    '/api/projects/:id',
    authenticateToken,
    authorize(PERMISSIONS.PROJECTS_DELETE),
    async (req, res) => {
        try {
            const project = await Project.findByIdAndDelete(req.params.id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found.'
                });
            }
            return res.json({
                success: true,
                message: 'Project deleted successfully!'
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

module.exports = router;