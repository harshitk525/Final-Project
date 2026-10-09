import hashlib
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

def hash_password(password: str) -> str:
    """Standard SHA-256 with salt for lightweight user password storage."""
    salt = "vektor_mobility_salt"
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()

@router.get("", response_model=List[UserResponse], summary="List users from PostgreSQL")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

@router.get("/{user_id}", response_model=UserResponse, summary="Get user by ID from PostgreSQL")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User with ID '{user_id}' not found.")
    return user

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create a new user in PostgreSQL")
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.id == User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        mobility_preference=user_in.mobility_preference or "step_free",
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
