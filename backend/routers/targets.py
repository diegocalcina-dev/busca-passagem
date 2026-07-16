import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Target
from schemas import TargetCreate, TargetUpdate, TargetResponse

router = APIRouter(prefix="/api/targets", tags=["targets"])


@router.get("", response_model=List[TargetResponse])
def list_targets(db: Session = Depends(get_db)):
    return db.query(Target).order_by(Target.created_at.desc()).all()


@router.post("", response_model=TargetResponse, status_code=status.HTTP_201_CREATED)
def create_target(payload: TargetCreate, db: Session = Depends(get_db)):
    target = Target(
        name=payload.name,
        origins=json.dumps(payload.origins),
        destination=payload.destination,
        one_way=payload.one_way,
        date_from=payload.date_from,
        date_to=payload.date_to,
        stay_min=payload.stay_min,
        stay_max=payload.stay_max,
        cabins=json.dumps(payload.cabins),
        max_stops=payload.max_stops,
        passengers=payload.passengers,
        currencies=json.dumps(payload.currencies),
        price_ceiling=payload.price_ceiling,
        active=payload.active,
    )
    db.add(target)
    db.commit()
    db.refresh(target)
    return target


@router.put("/{target_id}", response_model=TargetResponse)
def update_target(target_id: int, payload: TargetUpdate, db: Session = Depends(get_db)):
    target = db.query(Target).filter(Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ("origins", "cabins", "currencies") and isinstance(value, list):
            setattr(target, field, json.dumps(value))
        else:
            setattr(target, field, value)

    db.commit()
    db.refresh(target)
    return target


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(target_id: int, db: Session = Depends(get_db)):
    target = db.query(Target).filter(Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    db.delete(target)
    db.commit()


@router.patch("/{target_id}/toggle", response_model=TargetResponse)
def toggle_target(target_id: int, db: Session = Depends(get_db)):
    target = db.query(Target).filter(Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    target.active = not target.active
    db.commit()
    db.refresh(target)
    return target
