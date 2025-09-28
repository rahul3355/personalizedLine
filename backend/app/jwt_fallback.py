"""Minimal HS256 JWT implementation used when PyJWT is unavailable.

This module only implements the subset of functionality required by the
application tests: HS256 signing/verification, expiration (`exp`), issuer
(`iss`), and audience (`aud`) validation. It exposes a compatible surface with
the parts of PyJWT used by the FastAPI app so that production deployments can
still rely on the real dependency while local, offline test runs continue to
work.
"""

from __future__ import annotations

import base64
import json
import time
import hmac
import hashlib
from typing import Any, Dict, Iterable, Optional


class InvalidTokenError(Exception):
    """Raised when a token fails general validation checks."""


class ExpiredSignatureError(InvalidTokenError):
    """Raised when the token has expired."""


class InvalidAudienceError(InvalidTokenError):
    """Raised when the token audience does not match expectations."""


class InvalidIssuerError(InvalidTokenError):
    """Raised when the token issuer does not match expectations."""


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + padding)


def _sign(message: bytes, secret: str) -> bytes:
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).digest()


def encode(payload: Dict[str, Any], secret: str, algorithm: str = "HS256") -> str:
    if algorithm != "HS256":
        raise InvalidTokenError(f"Unsupported algorithm: {algorithm}")

    header = {"alg": algorithm, "typ": "JWT"}
    segments = [
        _b64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")),
        _b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")),
    ]

    signing_input = ".".join(segments).encode("utf-8")
    signature = _b64url_encode(_sign(signing_input, secret))
    segments.append(signature)
    return ".".join(segments)


def decode(
    token: str,
    secret: str,
    algorithms: Optional[Iterable[str]] = None,
    audience: Optional[str | Iterable[str]] = None,
    issuer: Optional[str] = None,
    options: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    algorithms = set(algorithms or [])
    if algorithms and "HS256" not in algorithms:
        raise InvalidTokenError("Unsupported algorithm")

    try:
        header_segment, payload_segment, signature_segment = token.split(".")
    except ValueError as exc:
        raise InvalidTokenError("Not enough segments") from exc

    header = json.loads(_b64url_decode(header_segment))
    if header.get("alg") != "HS256":
        raise InvalidTokenError("Invalid algorithm")

    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    expected_signature = _sign(signing_input, secret)
    received_signature = _b64url_decode(signature_segment)
    if not hmac.compare_digest(expected_signature, received_signature):
        raise InvalidTokenError("Signature verification failed")

    payload = json.loads(_b64url_decode(payload_segment))

    opts = options or {}
    required_claims = opts.get("require", [])
    for claim in required_claims:
        if claim not in payload:
            raise InvalidTokenError(f"Token missing required claim: {claim}")

    exp = payload.get("exp")
    if exp is not None:
        try:
            exp_value = float(exp)
        except (TypeError, ValueError) as exc:
            raise InvalidTokenError("Invalid exp claim") from exc
        if exp_value < time.time():
            raise ExpiredSignatureError("Token has expired")

    if issuer and payload.get("iss") != issuer:
        raise InvalidIssuerError("Invalid issuer")

    verify_aud = opts.get("verify_aud", True)
    if verify_aud and audience is not None:
        expected_audiences = {audience} if isinstance(audience, str) else set(audience)
        token_aud = payload.get("aud")
        if isinstance(token_aud, str):
            token_audiences = {token_aud}
        elif isinstance(token_aud, Iterable):
            token_audiences = set(token_aud)
        else:
            raise InvalidAudienceError("Invalid audience")

        if not token_audiences & expected_audiences:
            raise InvalidAudienceError("Invalid audience")

    return payload
