# NEXUS AI — Full-Stack Enterprise Platform

A production-ready, integrated Full-Stack Web Application built as the capstone project for the **VOLTIX Full-Stack Internship** program. This project consolidates **12 progressive tasks** into a single, cohesive, and professionally structured application.

---

## 📖 Table of Contents

- [Project Overview](#-project-overview)
- [Main Features](#-main-features)
- [Technologies Used](#-technologies-used)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
- [How to Run the Project](#-how-to-run-the-project)
- [API Endpoints](#-api-endpoints)
- [Default Admin Credentials](#-default-admin-credentials)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Author](#-author)

---

## 🎯 Project Overview

**NEXUS AI** is a corporate landing page + internal management platform for an AI solutions company. It allows:

- **Visitors** to browse services and submit inquiries (public site).
- **Customers** to register, log in, submit service requests, upload documents, and track their projects.
- **Admins & Employees** to manage services, inquiries, customer requests, files, users, roles, and client projects.

The project is built on a **monolithic, well-structured architecture** with a clean separation between:

- **Frontend** (HTML + CSS + Vanilla JS)
- **Backend** (Node.js + Express)
- **Database** (MongoDB Atlas + Mongoose)

---

## ✨ Main Features

### 🌐 Public Site (No Auth Required)
- **Landing page** with hero section and dynamic services list.
- **Dynamic Services** fetched from the backend with **search + sort**.
- **Contact / Inquiry form** — submits to backend, validated, and stored in MongoDB.

### 🔐 Authentication & Authorization
- **User Registration** with backend validation (name, email format, password).
- **Login** with JWT token generation and role-based redirect.
- **Password Reset** (simple recovery flow).
- **JWT-based session** with 2-hour expiry.
- **Password hashing** using `bcryptjs`.
- **Auto-promotion** of designated admin email.

### 👤 Customer Dashboard
- View and **update profile** (name, email, password).
- **Submit service requests** with title + description.
- **Track requests** with status filter (Pending / In Progress / Completed / Rejected).
- **Upload files** (PDF, DOC, XLS, PPT, TXT, images — up to 10MB).
- **Delete own files**.
- **View assigned projects**.

### 🛠️ Admin Panel
- **Create, update, delete services** — with search + sort.
- **View all customer inquiries**.
- **View and update customer request statuses**.
- **Upload & manage files** (all users' files, admin can delete any).
- **Manage users** (list, assign roles, delete).
- **Manage roles** (create/update/delete custom roles).
- **Project statistics** (total, in progress, completed, on hold).

### 📁 Project Management (Task 11)
- **Create, update, delete projects** (Admin).
- **Assign team members** (Admin).
- **Update project status** (Admin or assigned team member).
- **Role-based project visibility**:
  - Admin → all projects.
  - Team Member → only assigned projects.
  - Customer → only their own projects.

### 🛡️ Role-Based Access Control (RBAC)
- **4 default roles**: `admin`, `employee`, `customer`, `team_member`.
- **22 granular permissions** (e.g., `services:read`, `projects:create`).
- **Backend middleware** checks permissions before every protected operation.
- **Frontend permission-based UI** hides/shows elements based on the user's role and permissions.

---

## 🧰 Technologies Used

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js** | JavaScript runtime |
| **Express.js** | Web framework |
| **MongoDB Atlas** | Cloud database |
| **Mongoose** | MongoDB ODM |
| **JSON Web Tokens (JWT)** | Authentication |
| **bcryptjs** | Password hashing |
| **Multer** | File uploads |
| **dotenv** | Environment variables |
| **CORS** | Cross-Origin Resource Sharing |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **HTML5** | Structure |
| **CSS3** | Styling (custom, no framework) |
| **Vanilla JavaScript (ES6+)** | Interactions & API calls |
| **Fetch API** | HTTP requests |

### Tools
- **VS Code** + **Live Server** extension for the frontend.
- **Postman / PowerShell** for API testing.
- **Git** for version control.

---

## 📂 Project Structure
