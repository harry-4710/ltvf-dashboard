from pydantic import BaseModel
from typing import Optional, List


class LTVFRow(BaseModel):
    id: str
    parent_id: Optional[str] = None
    level: int
    label: str
    gl_account: Optional[str] = None
    cost_center: Optional[str] = None
    tc1_fi: Optional[float] = None
    total: Optional[float] = None
    net_mrp: Optional[float] = None
    local_amount: Optional[float] = None
    global_amount: Optional[float] = None
    delta: Optional[float] = None
    delta_pct: Optional[float] = None
    is_group: bool = False


class LTVFResponse(BaseModel):
    report_id: str
    title: str
    system: str
    client: str
    rows: List[LTVFRow]
    source: str  # "mock" or "sap"
