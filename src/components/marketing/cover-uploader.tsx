"use client";

import { useRef, useState, useTransition } from "react";
import { PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import { setPostCover } from "@/lib/actions/marketing-posts";
import { MAX_COVER_SIZE_BYTES } from "@/lib/constants";
import { publicMediaUrl } from "@/lib/marketing-media";
import { IMAGE_ACCEPT, uploadPostCover } from "@/lib/marketing-media-upload";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function CoverUploader({
  postId,
  coverPath,
  onChange,
}: {
  postId: string;
  coverPath: string | null;
  onChange: (path: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const url = publicMediaUrl(coverPath);

  function send(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const result = await uploadPostCover(postId, file);
      if (result.ok) onChange(result.path);
      else setError(result.error);
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await setPostCover(postId, null);
      if (result.ok) onChange(null);
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {url ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem do bucket público, sem allowlist de domínio configurada. */}
          <img
            src={url}
            alt="Prévia da capa do post"
            className="h-40 w-full rounded-sm border border-slate-200 object-cover sm:w-64"
          />
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
            >
              Trocar imagem
            </Button>
            <Button
              variant="tertiary"
              icon={TrashIcon}
              onClick={remove}
              disabled={pending}
              className="text-trend-negative hover:text-trend-negative"
            >
              Remover capa
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            send(event.dataTransfer.files[0]);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed p-8 text-center transition-colors",
            dragging
              ? "border-primary/50 bg-primary/[0.04]"
              : "border-slate-200 bg-white",
          )}
        >
          <PhotoIcon className="h-6 w-6 text-slate-400" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-700">
              Arraste a imagem de capa aqui
            </p>
            <p className="text-xs text-slate-500">
              JPG, PNG, WebP, AVIF ou GIF de até{" "}
              {MAX_COVER_SIZE_BYTES / 1024 / 1024} MB.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            {pending ? "Enviando…" : "Escolher arquivo"}
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          send(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
