import React, { useRef, useState } from "react";
import {
  Paperclip,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileArchive,
  Film,
  ExternalLink,
  Trash2,
  Cloud,
  Loader2,
} from "lucide-react";
import type { Stage, StageAttachment } from "../types";
import { teamApi } from "../services";
import { useToast } from "../context";

interface StageAttachmentsProps {
  teamId: string;
  thId: string;
  stage: Stage;
  isEditable?: boolean;
  onStageUpdated: (updatedStage: Stage) => void;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFileIcon(fileName: string, mimeType?: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf") || mimeType?.includes("pdf")) {
    return <FileText className="h-4 w-4 text-rose-500" />;
  }
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    mimeType?.startsWith("image/")
  ) {
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  }
  if (lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".tar.gz")) {
    return <FileArchive className="h-4 w-4 text-amber-500" />;
  }
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || mimeType?.startsWith("video/")) {
    return <Film className="h-4 w-4 text-purple-500" />;
  }
  return <Paperclip className="h-4 w-4 text-emerald-500" />;
}

export const StageAttachments: React.FC<StageAttachmentsProps> = ({
  teamId,
  thId,
  stage,
  isEditable = true,
  onStageUpdated,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const attachments: StageAttachment[] = Array.isArray(stage.attachments)
    ? stage.attachments
    : [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again if needed
    e.target.value = "";

    // 25MB validation
    if (file.size > 25 * 1024 * 1024) {
      showToast("File exceeds maximum allowed size of 25MB", "error");
      return;
    }

    try {
      setIsUploading(true);
      const updated = await teamApi.uploadStageAttachment(
        teamId,
        thId,
        stage._id,
        file
      );
      onStageUpdated(updated);
      showToast(`Uploaded "${file.name}" to AWS S3 successfully`, "success");
    } catch (err: any) {
      console.error("Upload error:", err);
      const message =
        err?.response?.data?.message || err?.message || "Failed to upload file to AWS S3";
      showToast(message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachment: StageAttachment) => {
    if (!window.confirm(`Delete "${attachment.name}" from AWS S3?`)) return;

    try {
      setDeletingId(attachment._id);
      const updated = await teamApi.deleteStageAttachment(
        teamId,
        thId,
        stage._id,
        attachment._id
      );
      onStageUpdated(updated);
      showToast(`Deleted "${attachment.name}" from AWS S3`, "success");
    } catch (err: any) {
      console.error("Delete attachment error:", err);
      const message =
        err?.response?.data?.message || err?.message || "Failed to delete file from AWS S3";
      showToast(message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Deliverables & Pitch Decks
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[9px] font-semibold text-blue-650 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
            <Cloud className="h-2.5 w-2.5" />
            AWS S3
          </span>
        </div>

        {isEditable && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.pptx,.ppt,.docx,.doc,.png,.jpg,.jpeg,.zip,.mp4"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  <span>Uploading to S3...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-3 w-3 text-blue-500" />
                  <span>Upload File</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500 italic">
          No deliverables attached yet. Upload pitch deck PDFs, presentation slides, or submission documents.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {attachments.map((att) => {
            const isDeleting = deletingId === att._id;
            const uploader =
              typeof att.uploadedBy === "object" && att.uploadedBy !== null
                ? att.uploadedBy.fullName || att.uploadedBy.username || "Team Member"
                : "Team Member";

            return (
              <div
                key={att._id}
                className="group relative flex items-center justify-between gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/60 dark:border-zinc-800/80 dark:bg-zinc-900/60 p-2.5 transition hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 shrink-0 shadow-xs">
                    {getFileIcon(att.name, att.fileType)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
                      title={att.name}
                    >
                      {att.name}
                    </a>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      <span>{formatBytes(att.size)}</span>
                      <span>•</span>
                      <span className="truncate">by {uploader}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
                    title="Open / Download"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(att)}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer disabled:opacity-40"
                      title="Delete from S3"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StageAttachments;
