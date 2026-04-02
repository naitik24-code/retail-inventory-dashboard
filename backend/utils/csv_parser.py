import csv
import hashlib
import io
import re

# We accept flexible column naming to make the UI upload compatible.
# Required logical fields for backend upload:
# - name
# - quantity
# - mrp
#
# `sku` is optional; if missing we generate it deterministically.
REQUIRED_LOGICAL_FIELDS = {"name", "quantity", "mrp"}

SERIALIZE_COLUMNS = ["sku", "name", "category", "quantity", "mrp_paise", "abc_xyz_class", "last_updated"]


_FIELD_SYNONYMS: dict[str, list[str]] = {
    "sku": ["sku", "product_code", "productcode", "code", "product id"],
    "name": ["name", "product name", "product", "item", "title"],
    "category": ["category", "cat"],
    "quantity": ["quantity", "qty", "available", "available qty", "available_quantity"],
    "mrp": ["mrp", "price", "cost"],
    # Optional enrichment fields
    "abc_xyz_class": ["abc_xyz_class", "abc xyz class", "abc_xyz"],
}


def _norm_header(h: str) -> str:
    """Normalize header for tolerant matching."""
    return re.sub(r"[^a-z0-9]+", "", (h or "").strip().lower())


def _pick_header(field: str, normalized_to_original: dict[str, str]) -> str | None:
    """
    Pick the original header name for a logical field, using normalized synonyms.
    Returns the original header string or None.
    """
    for synonym in _FIELD_SYNONYMS.get(field, []):
        nh = _norm_header(synonym)
        if nh in normalized_to_original:
            return normalized_to_original[nh]
    return None


def _generate_sku(*, name: str, category: str, quantity: int, mrp_paise: int) -> str:
    base = f"{category}-{name}" if category else name
    slug = re.sub(r"[^a-z0-9]+", "-", base.strip().lower()).strip("-")
    digest = hashlib.sha1(f"{base}|{quantity}|{mrp_paise}".encode("utf-8")).hexdigest()[:8]
    return f"{slug}-{digest}".upper()


def parse_csv(content: str) -> tuple[list[dict], list[str]]:
    """
    Parse CSV text into a list of row dicts and a list of skipped row descriptions.

    Returns (valid_rows, skipped_descriptions).
    If required logical fields are missing, returns ([], list_of_missing_column_names).

    - Converts mrp (Rupees, float string) -> mrp_paise (int) = round(float(mrp) * 100)
    - Skips rows where quantity < 0 or mrp_paise <= 0
    - Skips rows where name is empty
    - sku is optional; if missing/empty we generate one
    - Column matching is case-insensitive and strips whitespace and punctuation
    """
    reader = csv.DictReader(io.StringIO(content))

    # Normalize header names: strip whitespace and lowercase
    raw_fieldnames = reader.fieldnames or []
    normalized_to_original: dict[str, str] = {}
    for f in raw_fieldnames:
        nh = _norm_header(f)
        if nh and nh not in normalized_to_original:
            normalized_to_original[nh] = f

    missing_logical = [
        fld for fld in REQUIRED_LOGICAL_FIELDS if _pick_header(fld, normalized_to_original) is None
    ]
    if missing_logical:
        # Preserve earlier behavior: return a list of missing column names.
        return [], [f"Missing {fld}" for fld in missing_logical]

    valid_rows: list[dict] = []
    skipped: list[str] = []

    # Resolve actual CSV headers once.
    header_name = _pick_header("name", normalized_to_original)
    header_category = _pick_header("category", normalized_to_original)
    header_quantity = _pick_header("quantity", normalized_to_original)
    header_mrp = _pick_header("mrp", normalized_to_original)
    header_sku = _pick_header("sku", normalized_to_original)
    header_abc = _pick_header("abc_xyz_class", normalized_to_original)

    for i, row in enumerate(reader, start=2):  # row 1 is header
        def _get(h: str | None) -> str:
            if not h:
                return ""
            v = row.get(h, "")
            return (v or "").strip()

        sku = _get(header_sku)
        name = _get(header_name)
        category = _get(header_category)
        quantity_str = _get(header_quantity)
        mrp_str = _get(header_mrp)
        abc_xyz_class = _get(header_abc) or None

        # Skip rows with empty required fields.
        if not name:
            skipped.append(f"Row {i}: empty name")
            continue

        # Parse quantity
        try:
            quantity = int(quantity_str)
        except (ValueError, TypeError):
            skipped.append(f"Row {i}: invalid quantity '{quantity_str}'")
            continue

        # Parse mrp -> mrp_paise
        try:
            # Handle both paise (large int) and Rupees (small float)
            mrp_float = float(re.sub(r"[^\d.]+", "", mrp_str or "0"))
            # If the value is very large (e.g. > 100000) and has no decimal part, 
            # we assume it's already in paise from our template.
            # Otherwise, we assume it's in Rupees and multiply by 100.
            if mrp_float > 100000 and "." not in mrp_str:
                mrp_paise = int(mrp_float)
            else:
                mrp_paise = round(mrp_float * 100)
        except (ValueError, TypeError):
            skipped.append(f"Row {i}: invalid mrp '{mrp_str}'")
            continue

        # Skip invalid quantity or mrp_paise
        if quantity < 0:
            skipped.append(f"Row {i}: quantity < 0 ({quantity})")
            continue
        if mrp_paise <= 0:
            skipped.append(f"Row {i}: mrp_paise <= 0 ({mrp_paise})")
            continue

        # Generate SKU if missing
        if not sku:
            sku = _generate_sku(name=name, category=category, quantity=quantity, mrp_paise=mrp_paise)

        valid_rows.append({
            "sku": sku,
            "name": name,
            "category": category,
            "quantity": quantity,
            "mrp_paise": mrp_paise,
            "abc_xyz_class": abc_xyz_class,
        })

    return valid_rows, skipped


def serialize_items(items: list[dict]) -> str:
    """
    Serialize a list of InventoryItem dicts to a canonical CSV string.
    Fixed column order: sku, name, category, quantity, mrp_paise, abc_xyz_class, last_updated
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(SERIALIZE_COLUMNS)
    for item in items:
        writer.writerow([item.get(col, "") for col in SERIALIZE_COLUMNS])
    return output.getvalue()
