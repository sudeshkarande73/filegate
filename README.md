# 🛡️ FileGate – Secure File Sharing with Zero-Trust Architecture

<p align="center">

![Architecture](https://img.shields.io/badge/Architecture-Zero--Trust-10b981?style=for-the-badge)
![Encryption](https://img.shields.io/badge/Encryption-AES--256--GCM-45dfa4?style=for-the-badge)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge)

</p>

---

## 📖 Overview

**FileGate** is a secure file-sharing platform built using **Zero-Trust Architecture** principles. Instead of trusting every authenticated user, every file request is verified through multiple security layers before access is granted.

Files are encrypted using **AES-256-GCM**, while the server only manages authentication, authorization, metadata, and encrypted storage. Decryption happens entirely on the client, ensuring true **End-to-End Encryption (E2EE)**.

---

# ✨ Features

### 🔐 Authentication

- OTP-based Authentication
- Firebase Authentication
- HTTP-only JWT Cookies
- Single Device Login
- Session Persistence
- Device Approval

### 📂 Secure File Sharing

- Secure File Upload
- Drag & Drop `.vsf` File Opening
- Role-based File Sharing
- Instant Access Revocation
- Multi-user Sharing

### 🛡️ Security Features

- AES-256-GCM Encryption
- Split-Knowledge Architecture
- Zero-Trust Access Control
- Geo-Fencing
- Burn-After-Reading
- Time-Based Access Expiry
- Dynamic Watermarking
- Audit Logs
- View Only Mode

### 📄 Secure Document Viewer

Supports secure viewing of:

- PDF
- Word (.docx)
- Excel (.xlsx)
- Images
- Videos
- Audio
- Source Code
- Text Files

without downloading the original file.

---

# 🏗 Architecture

```
                User
                  │
                  ▼
          React Frontend
                  │
        Firebase Authentication
                  │
                  ▼
         Express.js Backend
                  │
      Authentication & ACL
                  │
        MongoDB + Cloudinary
                  │
         Encrypted File Storage
```

---

# 🔐 Upload Workflow

```
User Uploads File

↓

AES-256-GCM Encryption

↓

Ciphertext Generated

↓

Encrypted File → Cloudinary

↓

Metadata → MongoDB

↓

Generate .vsf Token
```

---

# 📥 Download Workflow

```
Drop .vsf File

↓

Authenticate User

↓

Validate Session

↓

ACL Verification

↓

Geo Validation

↓

Download Ciphertext

↓

Client-side Decryption

↓

Secure Viewer
```

---

# 📁 What is a `.vsf` File?

The `.vsf` file acts as a secure access token.

It contains metadata required to locate and decrypt the encrypted file without exposing the original document directly.

```json
{
  "fileId": "...",
  "version": "1.0"
}
```

---

# 🔒 Security Layers

Every request passes through multiple validation steps:

```
Authentication

↓

JWT Validation

↓

Device Approval

↓

Session Validation

↓

Access Control List

↓

Geo Restriction

↓

File Decryption
```

No file is accessible unless every security layer succeeds.

---

# ⚙️ Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Axios
- React Dropzone
- Web Crypto API

### Backend

- Node.js
- Express.js
- Firebase Admin SDK
- JWT
- Multer
- Nodemailer

### Database

- MongoDB
- Mongoose

### Cloud

- Cloudinary

---

# 📂 Project Structure

```
backend
│
├── config
├── controllers
├── middlewares
├── models
├── routes
└── utils

frontend
│
├── components
├── context
├── pages
├── utils
└── assets
```

---

# 🚀 Installation

Clone the repository

```bash
git clone https://github.com/yourusername/filegate.git
```

Backend

```bash
cd backend
npm install
npm run dev
```

Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# 🔑 Environment Variables

Backend

```env
PORT=

MONGO_URI=

JWT_SECRET=

EMAIL_USER=

EMAIL_PASS=

CLOUDINARY_CLOUD_NAME=

CLOUDINARY_API_KEY=

CLOUDINARY_API_SECRET=
```

Frontend

```env
VITE_API_URL=
```

---

# 🎯 Key Highlights

- Zero-Trust Security Architecture
- End-to-End Encryption
- Split-Knowledge Design
- Client-side Decryption
- HTTP-only JWT Authentication
- Secure Document Sandbox
- Offline Office Document Rendering
- Dynamic Watermarking
- Geo-Based Access Control
- Enterprise-style Governance Policies

---

# 🚀 Future Improvements

- RSA Envelope Encryption
- AWS KMS / Azure Key Vault Integration
- Client-side Multipart Uploads
- CDN-based Secure Streaming
- AI-based Threat Detection
- Secure File Versioning
- Mobile Application

---

# 👨‍💻 Author

**Sudesh Karande**

B.Tech Computer Science & Engineering

Walchand College of Engineering, Sangli

---

⭐ **If you found this project useful, consider giving it a star!**
