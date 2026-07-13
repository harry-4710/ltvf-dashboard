from models import LTVFRow

MOCK_ROWS: list[LTVFRow] = [
    # ── Global Parameters ──────────────────────────────────────────────────
    LTVFRow(id="GP", parent_id=None, level=0, label="Global Parameters",
            tc1_fi=None, total=None, net_mrp=None, is_group=True),

    # ── Tool Costs > MAESTR DATA 1.1 ──────────────────────────────────────
    LTVFRow(id="TC", parent_id=None, level=0, label="Tool Costs",
            tc1_fi=63117, total=2576, net_mrp=1129229, local_amount=100733,
            global_amount=1622064, delta=-492835, delta_pct=-43.7, is_group=True),

    LTVFRow(id="TC-M1", parent_id="TC", level=1, label="MAESTR DATA 1.1 M > 1.1 M",
            tc1_fi=63117, total=2576, net_mrp=1129229, local_amount=100733,
            global_amount=1622064, delta=-492835, delta_pct=-43.7, is_group=True),

    LTVFRow(id="TC-M1-01001", parent_id="TC-M1", level=2,
            label="ROBOT OPERATING AGREEMENT (AGI)",
            gl_account="01.001", tc1_fi=None, total=319,
            net_mrp=108715, local_amount=0, global_amount=108715,
            delta=0, delta_pct=0.0, is_group=False),

    LTVFRow(id="TC-M1-SC", parent_id="TC-M1", level=2,
            label="Singleton Check",
            gl_account="SC", tc1_fi=None, total=None,
            net_mrp=None, local_amount=None, global_amount=None,
            is_group=False),

    LTVFRow(id="TC-M1-NC", parent_id="TC-M1", level=2,
            label="Negative Check",
            gl_account="NC", tc1_fi=None, total=None,
            net_mrp=None, local_amount=None, global_amount=None,
            is_group=False),

    # ── Tool Costs > MAESTR DATA 2.11 AG ──────────────────────────────────
    LTVFRow(id="TC-M2", parent_id="TC", level=1, label="MAESTR DATA > 2.11 AG",
            tc1_fi=56163, total=2174, net_mrp=983501, local_amount=95470,
            global_amount=1413171, delta=-429670, delta_pct=-43.7, is_group=True),

    LTVFRow(id="TC-M2-01001", parent_id="TC-M2", level=2,
            label="GL ACCOUNT: General desc – rep",
            gl_account="01.001", tc1_fi=None, total=150,
            net_mrp=48200, local_amount=0, global_amount=48200,
            delta=0, delta_pct=0.0, is_group=False),

    LTVFRow(id="TC-M2-01002", parent_id="TC-M2", level=2,
            label="GL ACCOUNT: General desc – mat",
            gl_account="01.002", tc1_fi=None, total=210,
            net_mrp=67400, local_amount=12500, global_amount=79900,
            delta=-12500, delta_pct=-18.5, is_group=False),

    LTVFRow(id="TC-M2-01003", parent_id="TC-M2", level=2,
            label="GL ACCOUNT: Overhead alloc.",
            gl_account="01.003", tc1_fi=None, total=490,
            net_mrp=121000, local_amount=22000, global_amount=143000,
            delta=-22000, delta_pct=-18.2, is_group=False),

    # ── Business Partners ──────────────────────────────────────────────────
    LTVFRow(id="BP", parent_id=None, level=0, label="Business Partners",
            tc1_fi=50325, total=4716, net_mrp=984654,
            local_amount=93171, global_amount=1407825,
            delta=-423171, delta_pct=-43.0, is_group=True),

    LTVFRow(id="BP-BP1", parent_id="BP", level=1,
            label="BUSINESS PARTNERS GP1 – CUSTOMS, OTHER, GENERAL, Data (ACM)",
            cost_center="12.211", tc1_fi=None, total=400,
            net_mrp=95200, local_amount=18000, global_amount=113200,
            delta=-18000, delta_pct=-18.9, is_group=False),

    LTVFRow(id="BP-BP2", parent_id="BP", level=1,
            label="BUSINESS PARTNERS GP2 – CUSTOMS, OTHER, GENERAL, Data (ACM)",
            cost_center="12.212", tc1_fi=None, total=380,
            net_mrp=87500, local_amount=14000, global_amount=101500,
            delta=-14000, delta_pct=-16.0, is_group=False),

    LTVFRow(id="BP-BP3", parent_id="BP", level=1,
            label="BUSINESS PARTNERS GP3 – CUSTOMS, OTHER, GENERAL, Data (DE)",
            cost_center="12.221", tc1_fi=None, total=520,
            net_mrp=124000, local_amount=21000, global_amount=145000,
            delta=-21000, delta_pct=-16.9, is_group=False),

    LTVFRow(id="BP-BP4", parent_id="BP", level=1,
            label="BUSINESS PARTNERS GP4 – CUSTOMS, GERMANY DATA",
            cost_center="12.222", tc1_fi=None, total=12749,
            net_mrp=75263, local_amount=None, global_amount=75263,
            delta=0, delta_pct=0.0, is_group=False),
]
