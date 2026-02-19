"""
Cloudflare R2 storage service for video uploads.
Uses boto3 (S3-compatible API) to upload files and generate presigned URLs.
"""

import boto3
from botocore.config import Config
from uuid import uuid4
from pathlib import PurePosixPath
from app.config import settings


def _get_r2_client():
    """Create and return a boto3 S3 client configured for Cloudflare R2."""
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(
            signature_version="s3v4",
            region_name="auto",
        ),
    )


def _generate_key(folder: str, original_filename: str) -> str:
    """
    Generate a unique storage key like: drills/a1b2c3d4-original-name.mp4
    Preserves the file extension from the original filename.
    """
    ext = PurePosixPath(original_filename).suffix.lower()  # e.g. ".mp4"
    unique_id = uuid4().hex[:12]
    # Clean the filename: lowercase, replace spaces with hyphens
    clean_name = PurePosixPath(original_filename).stem.lower().replace(" ", "-")
    # Truncate long filenames
    clean_name = clean_name[:50]
    return f"{folder}/{unique_id}-{clean_name}{ext}"


def upload_file(file_bytes: bytes, original_filename: str, content_type: str, folder: str = "drills") -> str:
    """
    Upload a file to R2 and return the storage key.
    
    Args:
        file_bytes: Raw file content
        original_filename: Original name of the uploaded file
        content_type: MIME type (e.g., "video/mp4")
        folder: Storage folder/prefix (e.g., "drills", "form-checks", "messages")
    
    Returns:
        The storage key (path within the bucket)
    """
    client = _get_r2_client()
    key = _generate_key(folder, original_filename)

    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )

    return key


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned URL for reading a file from R2.
    
    Args:
        key: The storage key returned from upload_file()
        expires_in: URL expiration in seconds (default 1 hour)
    
    Returns:
        A temporary, signed URL that allows direct access to the file
    """
    client = _get_r2_client()

    url = client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.R2_BUCKET_NAME,
            "Key": key,
        },
        ExpiresIn=expires_in,
    )

    return url


def delete_file(key: str) -> None:
    """Delete a file from R2."""
    client = _get_r2_client()
    client.delete_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
    )
