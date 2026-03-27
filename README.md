# ESP32 WebApp

A web application with a **FastAPI backend** and **React frontend** for authentication and dashboard access.

## 🚀 Features
- User login with JWT authentication
- Protected routes
- React frontend built with Vite
- Role-based access (admin vs user)

## 🛠 Setup Instructions

### Backend (FastAPI)
```bash
cd esp32-webapp
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

