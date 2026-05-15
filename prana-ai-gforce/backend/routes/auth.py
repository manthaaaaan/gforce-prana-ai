from fastapi import APIRouter, HTTPException, status, Depends

from context import context, UserRole
from models import UserCreate, UserResponse, LoginRequest, TokenResponse
from auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    existing_user = context.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = get_password_hash(user.password)
    new_user = context.create_user(
        name=user.name,
        email=user.email,
        phone=user.phone,
        password_hash=password_hash,
        role=user.role
    )
    
    access_token = create_access_token({"sub": new_user.id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            phone=new_user.phone,
            role=new_user.role
        )
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    user = context.get_user_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            phone=user.phone,
            role=user.role
        )
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user