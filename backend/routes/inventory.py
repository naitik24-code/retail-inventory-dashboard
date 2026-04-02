from typing import Annotated

import sqlalchemy.exc
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from backend import crud
from backend.database import get_db
from backend.schemas import (
    InventoryCountResponse,
    InventoryItemCreate,
    InventoryItemOut,
    InventoryItemUpdate,
)

router = APIRouter()


@router.get("/inventory", response_model=list[InventoryItemOut])
def list_inventory(
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(le=500)] = 100,
    offset: int = 0,
    category: str | None = None,
    search: str | None = None,
    status: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
):
    return crud.get_items(
        db,
        limit=limit,
        offset=offset,
        category=category,
        search=search,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/inventory/count", response_model=InventoryCountResponse)
def count_inventory(
    db: Annotated[Session, Depends(get_db)],
    category: str | None = None,
    search: str | None = None,
    status: str | None = None,
):
    total = crud.count_items(db, category=category, search=search, status=status)
    return InventoryCountResponse(total=total)


@router.get("/inventory/{item_id}", response_model=InventoryItemOut)
def get_inventory_item(item_id: int, db: Annotated[Session, Depends(get_db)]):
    result = crud.get_item(db, item_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Item with id {item_id} not found")
    return result


@router.post("/inventory", response_model=InventoryItemOut, status_code=201)
def create_inventory_item(item: InventoryItemCreate, db: Annotated[Session, Depends(get_db)]):
    try:
        return crud.create_item(db, item)
    except sqlalchemy.exc.IntegrityError:
        raise HTTPException(status_code=409, detail=f"Item with sku '{item.sku}' already exists")


@router.put("/inventory/{item_id}", response_model=InventoryItemOut)
def update_inventory_item(item_id: int, patch: InventoryItemUpdate, db: Annotated[Session, Depends(get_db)]):
    result = crud.update_item(db, item_id, patch)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Item with id {item_id} not found")
    return result


@router.delete("/inventory/{item_id}", status_code=204)
def delete_inventory_item(item_id: int, db: Annotated[Session, Depends(get_db)]):
    deleted = crud.delete_item(db, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Item with id {item_id} not found")
    return Response(status_code=204)
