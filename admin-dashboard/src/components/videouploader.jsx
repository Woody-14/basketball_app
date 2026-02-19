import { useState, useRef, useCallback } from 'react';

/**
 * VideoUploader — Drag-and-drop video upload component for the admin dashboard.
 * 
 * Props:
 *   onUploadComplete(data) — called with { key, url, filename, content_type } after successful upload
 *   currentVideoUrl — optional existing video URL to show as preview
 *   currentVideoKey — optional existing R2 key (shown for reference)
 *   folder — R2 folder to upload to (default: "drills")
 */
export default function VideoUploader({ onUploadComplete, currentVideoUrl, currentVideoKey, folder = 'drills' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(currentVideoUrl || null);
  const fileInputRef = useRef(null);

  const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/x-msvideo'];
  const MAX_SIZE_MB = 500;

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload MP4, MOV, WebM, M4V, or AVI.';
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_SIZE_MB}MB.`;
    }
    return null;
  };

  const uploadFile = useCallback(async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
        }
      });

      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.detail || 'Upload failed'));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));

        xhr.open('POST', `/api/uploads/${folder}`);
        
        // Add auth token
        const token = localStorage.getItem('auth_token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formData);
      });

      // Success!
      setPreview(result.url);
      onUploadComplete?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, [folder, onUploadComplete]);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setProgress(0);
    onUploadComplete?.(null);
  };

  return (
    <div className="video-uploader">
      {/* Video preview */}
      {preview && !uploading && (
        <div className="video-uploader__preview">
          <video
            src={preview}
            controls
            preload="metadata"
            style={{
              width: '100%',
              maxHeight: '300px',
              borderRadius: '8px',
              backgroundColor: '#000',
            }}
          />
          <div className="video-uploader__preview-actions">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary btn-sm"
            >
              Replace Video
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="btn btn-danger btn-sm"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Upload zone — show when no video or currently uploading */}
      {(!preview || uploading) && (
        <div
          className={`video-uploader__dropzone ${isDragging ? 'video-uploader__dropzone--active' : ''} ${uploading ? 'video-uploader__dropzone--uploading' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="video-uploader__progress">
              <div className="video-uploader__progress-icon">⬆️</div>
              <div className="video-uploader__progress-text">Uploading... {progress}%</div>
              <div className="video-uploader__progress-bar">
                <div
                  className="video-uploader__progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="video-uploader__prompt">
              <div className="video-uploader__icon">🎬</div>
              <div className="video-uploader__text">
                <strong>Drop video here</strong> or click to browse
              </div>
              <div className="video-uploader__hint">
                MP4, MOV, WebM, M4V, or AVI · Max {MAX_SIZE_MB}MB
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Error message */}
      {error && (
        <div className="video-uploader__error">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
