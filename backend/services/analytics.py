"""Analytics over incidents and near-misses for the Intelligence agent."""
from __future__ import annotations

import pandas as pd

from services.data_loader import get_incidents, get_near_misses


def headline_stats() -> dict:
    inc = get_incidents()
    nm = get_near_misses()
    high_pot = int((inc["severity"] == "High Potential").sum())
    serious = int((inc["severity"].isin(["Serious", "High Potential"])).sum())
    # near-miss reporting ratio (a leading indicator): near misses per serious incident
    ratio = round(len(nm) / serious, 1) if serious else 0.0
    return {
        "total_incidents": int(len(inc)),
        "total_near_misses": int(len(nm)),
        "high_potential": high_pot,
        "serious_incidents": serious,
        "near_miss_ratio": ratio,
        "sites_covered": int(inc["site"].nunique()),
    }


def _counts(series: pd.Series) -> list[dict]:
    return [{"name": str(k), "value": int(v)} for k, v in series.items()]


def breakdowns() -> dict:
    inc = get_incidents()
    by_type = inc["type"].value_counts().sort_values(ascending=False)
    by_site = inc["site"].value_counts().sort_values(ascending=False)
    by_severity = inc["severity"].value_counts()
    by_cause = inc["root_cause"].value_counts().head(8)
    return {
        "by_type": _counts(by_type),
        "by_site": _counts(by_site),
        "by_severity": _counts(by_severity),
        "by_root_cause": _counts(by_cause),
    }


def monthly_trend() -> list[dict]:
    inc = get_incidents().copy()
    nm = get_near_misses().copy()
    inc["month"] = inc["date"].dt.to_period("M").astype(str)
    nm["month"] = nm["date"].dt.to_period("M").astype(str)
    inc_m = inc.groupby("month").size()
    nm_m = nm.groupby("month").size()
    months = sorted(set(inc_m.index) | set(nm_m.index))
    return [
        {
            "month": m,
            "incidents": int(inc_m.get(m, 0)),
            "near_misses": int(nm_m.get(m, 0)),
        }
        for m in months
    ]


def recurring_patterns(min_count: int = 4) -> list[dict]:
    """Group incidents by (type, root_cause) and surface frequent combinations.

    These are the 'recurring patterns persisting without systemic learning'
    that the SoW calls out as pain point #3.
    """
    inc = get_incidents()
    grp = (
        inc.groupby(["type", "root_cause"])
        .agg(
            count=("incident_id", "size"),
            sites=("site", lambda s: sorted(s.unique().tolist())),
            top_area=("area", lambda s: s.value_counts().idxmax()),
            linked_sop=("linked_sop", lambda s: s.mode().iat[0] if not s.mode().empty else ""),
            sample=("narrative", lambda s: s.iloc[0]),
        )
        .reset_index()
    )
    grp = grp[grp["count"] >= min_count].sort_values("count", ascending=False)
    patterns = []
    for i, row in enumerate(grp.itertuples(index=False), 1):
        patterns.append(
            {
                "pattern_id": f"PAT-{i:02d}",
                "type": row.type,
                "root_cause": row.root_cause,
                "count": int(row.count),
                "sites": row.sites,
                "top_area": row.top_area,
                "linked_sop": row.linked_sop,
                "sample": row.sample,
            }
        )
    return patterns
