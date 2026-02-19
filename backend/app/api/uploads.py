"""
Upload API routes for video files.
Handles drill demo videos, form check videos, and message attachments.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from pydantic import BaseModel
from app.services.storage import upload_file, get_presigned_url, delete_file
from app.services.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

# Max file size: 500MB (videos can be large)
MAX_FILE_SIZE = 500 * 1024 * 1024

ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/quicktime",     # .mov
    "video/x-msvideo",     # .avi
    "video/webm",
    "video/x-m4v",         # .m4v
}

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_TYPES = ALLOWED_VIDEO_TYPES | ALLOWED_IMAGE_TYPES


class UploadResponse(BaseModel):
    key: str
    url: str
    content_type: str
    filename: str


class PresignedUrlResponse(BaseModel):
    url: str
    key: str


@router.post("/{folder}", response_model=UploadResponse)
async def upload_video(
    folder: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a video or image file to R2 storage.
    
    Folders:
    - drills: Coach drill demonstration videos (coach only)
    - form-checks: Student form check submissions (any user)
    - messages: Message attachments (any user)
    """
    # Validate folder
    valid_folders = {"drills", "form-checks", "messages", "thumbnails"}
    if folder not in valid_folders:
        raise HTTPException(status_code=400, detail=f"Invalid folder. Must be one of: {', '.join(valid_folders)}")

    # Only coaches can upload to the drills folder
    if folder == "drills" and current_user.role != "coach":
        raise HTTPException(status_code=403, detail="Only coaches can upload drill videos")

    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed. Accepted: mp4, mov, avi, webm, m4v, jpg, png, webp"
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # Upload to R2
    try:
        key = upload_file(
            file_bytes=content,
            original_filename=file.filename,
            content_type=file.content_type,
            folder=folder,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()  # prints full stack trace to uvicorn console
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    # Generate a presigned URL for immediate use
    url = get_presigned_url(key)

    return UploadResponse(
        key=key,
        url=url,
        content_type=file.content_type,
        filename=file.filename,
    )


@router.get("/presigned-url", response_model=PresignedUrlResponse)
async def get_video_url(
    key: str = Query(..., description="Storage key of the file"),
    current_user: User = Depends(get_current_user),
):
    """
    Get a fresh presigned URL for an existing file.
    Call this when a previously generated URL has expired.
    """
    try:
        url = get_presigned_url(key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate URL: {str(e)}")

    return PresignedUrlResponse(url=url, key=key)


@router.delete("/{key:path}")
async def delete_video(
    key: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a file from R2 storage. Coach only."""
    if current_user.role != "coach":
        raise HTTPException(status_code=403, detail="Only coaches can delete files")

    try:
        delete_file(key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

    return {"detail": "File deleted", "key": key}
