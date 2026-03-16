"use client";

import { useState, useCallback, useRef } from "react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export default function FileUpload({ onFileSelected, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") {
        alert("PDF 파일만 업로드할 수 있습니다.");
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
        ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
        ${isLoading ? "pointer-events-none opacity-50" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
      />
      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-gray-600">PDF 파싱 중...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-lg text-gray-600">
            PDF 파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-sm text-gray-400">AWS CCP 덤프 파일 (CLF-C02)</p>
        </div>
      )}
    </div>
  );
}
