"""
My Bibi — Mirror principle guard

The mirror principle: AI insights and personal data about person A go ONLY to
person A. This utility is the authoritative enforcement point.

Call `assert_own_data_only` before returning any analysis, journal entry,
or personal insight to any user. It raises 403 if the requesting user is
not the data owner.
"""

from fastapi import HTTPException, status


def assert_own_data_only(requesting_user_id: str, data_owner_id: str) -> None:
    """
    Mirror principle enforcement. Call this before returning any
    analysis, journal entry, or personal insight to a user.

    Raises HTTP 403 if requesting_user_id != data_owner_id.

    Usage:
        assert_own_data_only(current_user["id"], journal_entry.user_id)
    """
    if requesting_user_id != data_owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Mirror principle violation: cannot access another user's "
                "personal data. AI insights and private data are strictly "
                "personal — they go only to the person they belong to."
            ),
        )


def assert_not_partner_analysis(feature_name: str) -> None:
    """
    Raises a 403 with a clear message if a feature would perform
    analysis of partner A and deliver it to partner B.

    Call this in any AI feature that reads one user's data to generate
    insights for another user.

    Usage (to explicitly document and block a feature):
        assert_not_partner_analysis("sentiment_analysis_of_partner_messages")
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            f"Feature '{feature_name}' is blocked by the mirror principle. "
            "This app never analyses one partner's behaviour and delivers "
            "the result to the other partner. This is not a configuration — "
            "it is a hard limit."
        ),
    )
