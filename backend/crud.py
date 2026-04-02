from datetime import UTC, datetime

from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models import InventoryItem
from backend.schemas import InventoryItemCreate, InventoryItemUpdate

ALLOWED_SORT_COLUMNS = {"id", "sku", "name", "category", "quantity", "mrp_paise", "last_updated"}


def get_items(
    db: Session,
    limit: int = 100,
    offset: int = 0,
    category: str | None = None,
    search: str | None = None,
    status: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> list[InventoryItem]:
    query = db.query(InventoryItem)

    if category is not None:
        query = query.filter(InventoryItem.category == category)

    if search:
        like = f"%{search}%"
        query = query.filter(InventoryItem.name.ilike(like))

    if status:
        # Keep status logic aligned with the frontend UX labels.
        st = status.lower()
        if st in ("healthy", "in stock"):
            query = query.filter(InventoryItem.quantity >= 5)
        elif st in ("low stock", "low"):
            query = query.filter(InventoryItem.quantity >= 1, InventoryItem.quantity <= 4)
        elif st in ("dead stock", "out of stock", "dead"):
            query = query.filter(InventoryItem.quantity == 0)

    if sort_by is not None and sort_by in ALLOWED_SORT_COLUMNS:
        col = getattr(InventoryItem, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())

    return query.offset(offset).limit(limit).all()


def count_items(
    db: Session,
    category: str | None = None,
    search: str | None = None,
    status: str | None = None,
) -> int:
    query = db.query(func.count(InventoryItem.id))

    if category is not None:
        query = query.filter(InventoryItem.category == category)

    if search:
        like = f"%{search}%"
        query = query.filter(InventoryItem.name.ilike(like))

    if status:
        st = status.lower()
        if st in ("healthy", "in stock"):
            query = query.filter(InventoryItem.quantity >= 5)
        elif st in ("low stock", "low"):
            query = query.filter(InventoryItem.quantity >= 1, InventoryItem.quantity <= 4)
        elif st in ("dead stock", "out of stock", "dead"):
            query = query.filter(InventoryItem.quantity == 0)

    return int(query.scalar() or 0)


def get_item(db: Session, item_id: int) -> InventoryItem | None:
    return db.query(InventoryItem).filter(InventoryItem.id == item_id).first()


def create_item(db: Session, item: InventoryItemCreate) -> InventoryItem:
    db_item = InventoryItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_item(db: Session, item_id: int, patch: InventoryItemUpdate) -> InventoryItem | None:
    db_item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if db_item is None:
        return None

    for field, value in patch.model_dump(exclude_none=True).items():
        setattr(db_item, field, value)

    db_item.last_updated = datetime.now(UTC)
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_item(db: Session, item_id: int) -> bool:
    db_item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if db_item is None:
        return False

    db.delete(db_item)
    db.commit()
    return True


def upsert_item_by_sku(db: Session, item: InventoryItemCreate) -> tuple[InventoryItem, bool]:
    db_item = db.query(InventoryItem).filter(InventoryItem.sku == item.sku).first()

    if db_item is not None:
        for field, value in item.model_dump().items():
            setattr(db_item, field, value)
        db_item.last_updated = datetime.now(UTC)
        db.commit()
        db.refresh(db_item)
        return db_item, False

    db_item = InventoryItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item, True
