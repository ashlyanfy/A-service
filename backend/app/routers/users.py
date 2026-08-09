import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_admin, require_any
from app.core.security import hash_password
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.user import UserCreate, UserLanguageUpdate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> list[UserOut]:
    result = await db.execute(select(User).order_by(User.name))
    users = result.scalars().all()
    return [UserOut.model_validate(u) for u in users]


@router.patch("/me/language", response_model=UserOut)
async def update_my_language(
    payload: UserLanguageUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    user.language = payload.language
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserOut:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        name=payload.name,
        role=payload.role,
        language=payload.language,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()
    db.add(AuditLog(user_id=admin.id, action="create", entity="user", entity_id=str(user.id), meta=None))
    await db.commit()
    await db.refresh(user)

    return UserOut.model_validate(user)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserOut:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    changes = payload.model_dump(exclude_unset=True, exclude={"password"})
    for field, value in changes.items():
        setattr(user, field, value)

    if payload.password:
        user.password_hash = hash_password(payload.password)
        user.token_version += 1
        changes["password"] = "***"

    if changes:
        db.add(AuditLog(user_id=admin.id, action="update", entity="user", entity_id=str(user.id), meta=changes))

    await db.commit()
    await db.refresh(user)

    return UserOut.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete yourself")

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.add(AuditLog(user_id=admin.id, action="delete", entity="user", entity_id=str(user.id), meta=None))
    await db.delete(user)
    await db.commit()
