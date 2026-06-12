"""
My Bibi — Guardrail tests

These tests pin the ethical core in place. If any of them fail, a
guardrail has been broken and the change must be rejected.

Run from backend/:  python -m pytest tests/ -v
"""

import pytest
from fastapi import HTTPException

from utils.mirror_guard import assert_own_data_only, assert_not_partner_analysis
from utils import crypto
from services.ai_service import assert_single_subject


USER_A = "user-a-1111"
USER_B = "user-b-2222"


class TestMirrorPrinciple:
    def test_own_data_passes(self):
        assert_own_data_only(USER_A, USER_A)  # must not raise

    def test_other_users_data_is_403(self):
        with pytest.raises(HTTPException) as exc:
            assert_own_data_only(USER_A, USER_B)
        assert exc.value.status_code == 403

    def test_partner_analysis_features_are_always_blocked(self):
        with pytest.raises(HTTPException) as exc:
            assert_not_partner_analysis("sentiment_of_partner_messages")
        assert exc.value.status_code == 403

    def test_ai_layer_rejects_cross_person_subjects(self):
        # AI may analyse only the requesting user's own words.
        assert_single_subject(USER_A, USER_A)  # ok
        with pytest.raises(PermissionError):
            assert_single_subject(USER_A, USER_B)


class TestJournalEncryption:
    def setup_method(self):
        crypto.lock_user(USER_A)
        crypto.lock_user(USER_B)

    def test_encrypt_roundtrip(self):
        crypto.unlock_user(USER_A, "correct horse battery staple")
        stored = crypto.encrypt_for_user(USER_A, "my private thought")
        assert stored.startswith(crypto.ENC_PREFIX)
        assert "my private thought" not in stored
        assert crypto.decrypt_for_user(USER_A, stored) == "my private thought"

    def test_locked_user_cannot_encrypt(self):
        with pytest.raises(KeyError):
            crypto.encrypt_for_user(USER_A, "should fail")

    def test_partner_key_cannot_decrypt(self):
        """The self-hosting partner cannot read the other's entries."""
        crypto.unlock_user(USER_A, "password-of-a")
        stored = crypto.encrypt_for_user(USER_A, "secret entry")
        crypto.lock_user(USER_A)

        # B unlocks with their own password — and must NOT be able to read A's data
        crypto.unlock_user(USER_B, "password-of-b")
        with pytest.raises(KeyError):
            # A's key is not in memory at all
            crypto.decrypt_for_user(USER_A, stored)

    def test_wrong_password_fails_decrypt(self):
        crypto.unlock_user(USER_A, "first password")
        stored = crypto.encrypt_for_user(USER_A, "secret")
        crypto.unlock_user(USER_A, "different password")
        with pytest.raises(crypto.InvalidToken):
            crypto.decrypt_for_user(USER_A, stored)

    def test_legacy_plaintext_passes_through(self):
        assert crypto.decrypt_for_user(USER_A, "old plaintext entry") == "old plaintext entry"
        assert not crypto.is_encrypted("old plaintext entry")
