# ExpireX – Secure Document Control System

## 📌 Overview

ExpireX is a Secure Document Control System designed to provide advanced protection for sensitive digital documents. The platform enables controlled document sharing with automatic expiration, device-specific access, location-based restrictions, and real-time activity monitoring.

The system ensures that confidential files remain accessible only to authorized users under predefined conditions, reducing the risk of unauthorized distribution and data leakage.

---

## 🚀 Features

### 🔒 Secure Document Sharing
- Upload and distribute confidential documents securely.
- Access granted only to authorized users.

### ⏳ Auto Expiration
- Documents automatically expire after:
  - Specific date/time
  - Defined number of views
  - Download limits

### 📍 Location-Based Access Control
- Restrict document access to approved geographic locations.

### 💻 Device-Specific Access
- Allow document access only from registered devices.

### 📊 Real-Time Monitoring
- Track document activities including:
  - Views
  - Downloads
  - Access attempts
  - Expiration events

### 🔔 Alerts & Notifications
- Receive alerts for:
  - Unauthorized access attempts
  - Expired documents
  - Security violations

### 🗂️ Download Management
- Controlled and monitored file downloads.

### 👤 User Authentication
- Secure login and authorization system.

---

## 🏗️ System Architecture

Frontend (React + Tailwind CSS)
↓
Backend (Node.js + Express.js)
↓
MySQL Database
↓
Azure Blob Storage
↓
Security & Monitoring Layer

---

## 🛠️ Technology Stack

### Frontend
- React.js
- Tailwind CSS
- JavaScript
- HTML5
- CSS3

### Backend
- Node.js
- Express.js

### Database
- MySQL

### Cloud Storage
- Azure Blob Storage

### Security
- Device Verification
- Access Monitoring
- Location-Based Validation
- Document Expiration Policies

---

## 📂 Project Structure

ExpireX/
├── backend/
│ ├── config/
│ ├── controllers/
│ ├── routes/
│ ├── services/
│ ├── scripts/
│ ├── utils/
│ ├── server.js
│ └── package.json
│
├── frontend/
│ ├── public/
│ ├── src/
│ ├── package.json
│ ├── tailwind.config.js
│ └── postcss.config.js
│
├── database/
│ ├── schema.sql
│ └── security_schema.sql
│
├── docs/
│ └── system_architecture
│
├── README.md
└── .gitignore

---

## ⚙️ Installation

### Clone Repository

git clone https://github.com/yourusername/ExpireX.git

cd ExpireX

### Backend Setup

cd backend

npm install

Create a .env file and configure:

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=expirex

AZURE_STORAGE_CONNECTION_STRING=your_connection_string

Start Backend:

npm start

### Frontend Setup

cd frontend

npm install

npm start

---

## 🗄️ Database Setup

1. Create MySQL database.
2. Import:

database/schema.sql

database/security_schema.sql

3. Update database credentials in .env.

---

## 🔐 Security Features

- Secure authentication
- Access logging
- Device fingerprint validation
- Location verification
- Time-based document expiration
- Download restrictions
- Security event monitoring

---

## 📈 Future Enhancements

- Multi-Factor Authentication (MFA)
- AI-Based Threat Detection
- Blockchain-Based Audit Logs
- Mobile Application Support
- Advanced Analytics Dashboard

---

## 👨‍💻 Author

Parth Patil

Bachelor of Engineering (Computer Engineering)

Project: ExpireX – Secure Document Control System
