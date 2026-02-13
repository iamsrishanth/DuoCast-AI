import { useState, useRef, useCallback } from 'react';

export default function ImageUpload({ label, sublabel, image, onImageChange }) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef(null);

    const handleFile = useCallback((file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                onImageChange({
                    file,
                    preview: e.target.result,
                });
            };
            reader.readAsDataURL(file);
        }
    }, [onImageChange]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, [handleFile]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragging(false);
    }, []);

    const handleClick = () => {
        inputRef.current?.click();
    };

    const handleInputChange = (e) => {
        const file = e.target.files[0];
        handleFile(file);
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        onImageChange(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const className = [
        'upload-zone',
        dragging && 'dragging',
        image && 'has-image',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={className}
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="upload-zone__input"
                onChange={handleInputChange}
            />

            {image ? (
                <>
                    <img
                        src={image.preview}
                        alt={label}
                        className="upload-zone__preview"
                    />
                    <button className="upload-zone__remove" onClick={handleRemove}>
                        ×
                    </button>
                </>
            ) : (
                <>
                    <div className="upload-zone__icon">📷</div>
                    <div className="upload-zone__label">{label}</div>
                    <div className="upload-zone__hint">{sublabel || 'Drag & drop or click to upload'}</div>
                </>
            )}
        </div>
    );
}
