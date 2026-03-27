from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import timedelta
from sqlalchemy.orm import Session

from app.auth import (
    verify_password,
    hash_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user,
)
from app.db import SessionLocal
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------
# Database dependency
# ---------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------
# Request models
# ---------------------------
class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "user"   # default role is "user"

class LoginRequest(BaseModel):
    username: str
    password: str

# ---------------------------
# Register route
# ---------------------------
@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_pw = hash_password(request.password)
    user = User(username=request.username, hashed_password=hashed_pw, role=request.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "msg": "User registered successfully",
        "username": user.username,
        "role": user.role,
    }

# ---------------------------
# Login route
# ---------------------------
@router.post("/token")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}

# ---------------------------
# Protected route (any logged-in user)
# ---------------------------
@router.get("/protected")
def protected_route(current_user=Depends(get_current_user)):
    return {
        "message": f"Hello {current_user['username']}, you accessed a protected route!",
        "role": current_user["role"],
    }

# ---------------------------
# Admin-only route
# ---------------------------
@router.get("/admin")
def admin_route(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return {"message": f"Welcome {current_user['username']}, you are an admin!"}

# ---------------------------
# Multi-role route (example)
# ---------------------------
@router.get("/moderator-or-admin")
def moderator_or_admin_route(current_user=Depends(get_current_user)):
    if current_user["role"] not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return {
        "message": f"Hello {current_user['username']}, you have moderator/admin access!"
    }
