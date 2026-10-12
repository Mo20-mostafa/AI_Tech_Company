// ==========================================
// utils/permissions.js
// Central Permissions Registry (Task 9 - RBAC)
// ------------------------------------------
// This file is the single source of truth for:
//   1. All permissions used across the system.
//   2. Default roles and the permissions assigned to each.
// Adding a new permission here propagates it everywhere automatically.
// ==========================================

/**
 * All permissions available in the system.
 * Format: RESOURCE_ACTION -> 'resource:action'
 */
const PERMISSIONS = {
    // Services (Tasks 3, 6, 8)
    SERVICES_READ: 'services:read',
    SERVICES_CREATE: 'services:create',
    SERVICES_UPDATE: 'services:update',
    SERVICES_DELETE: 'services:delete',

    // Inquiries (Task 2)
    INQUIRIES_READ: 'inquiries:read',

    // Customer Requests (Task 7)
    REQUESTS_CREATE_OWN: 'requests:create_own',
    REQUESTS_READ_OWN: 'requests:read_own',
    REQUESTS_READ_ALL: 'requests:read_all',
    REQUESTS_UPDATE_STATUS: 'requests:update_status',

    // Users Management (Task 9)
    USERS_READ: 'users:read',
    USERS_ASSIGN_ROLE: 'users:assign_role',
    USERS_DELETE: 'users:delete',

    // Roles Management (Task 9)
    ROLES_READ: 'roles:read',
    ROLES_CREATE: 'roles:create',
    ROLES_UPDATE: 'roles:update',
    ROLES_DELETE: 'roles:delete',

    // File Management (Task 10)
    FILES_READ_ALL: 'files:read_all',
    FILES_DELETE_ANY: 'files:delete_any',

    // Project Management (Task 11)
    PROJECTS_READ: 'projects:read',
    PROJECTS_CREATE: 'projects:create',
    PROJECTS_UPDATE: 'projects:update',
    PROJECTS_DELETE: 'projects:delete',
    PROJECTS_ASSIGN: 'projects:assign'
};

/**
 * Default roles seeded on server boot.
 * These are "system roles" and cannot be deleted via API.
 */
const DEFAULT_ROLES = {
    // Administrator — full system access
    admin: {
        displayName: 'Administrator',
        description: 'Full system access',
        permissions: Object.values(PERMISSIONS)
    },

    // Regular Employee — read data + update request statuses
    employee: {
        displayName: 'Regular Employee',
        description: 'Can read data and update request statuses',
        permissions: [
            PERMISSIONS.SERVICES_READ,
            PERMISSIONS.INQUIRIES_READ,
            PERMISSIONS.REQUESTS_READ_ALL,
            PERMISSIONS.REQUESTS_UPDATE_STATUS,
            PERMISSIONS.USERS_READ,
            PERMISSIONS.FILES_READ_ALL,
            PERMISSIONS.PROJECTS_READ
        ]
    },

    // Customer — end-user with own-data access
    customer: {
        displayName: 'Customer',
        description: 'End-user with own-data access',
        permissions: [
            PERMISSIONS.SERVICES_READ,
            PERMISSIONS.REQUESTS_CREATE_OWN,
            PERMISSIONS.REQUESTS_READ_OWN,
            PERMISSIONS.PROJECTS_READ
        ]
    },

    // Team Member — view + update assigned projects
    team_member: {
        displayName: 'Team Member',
        description: 'Can view and update assigned projects',
        permissions: [
            PERMISSIONS.SERVICES_READ,
            PERMISSIONS.PROJECTS_READ,
            PERMISSIONS.PROJECTS_UPDATE
        ]
    }
};

module.exports = {
    PERMISSIONS,
    DEFAULT_ROLES
};