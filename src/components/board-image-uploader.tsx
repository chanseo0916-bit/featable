"use client";

import {
  ChangeEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

const MAX_IMAGES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type InitialImage = {
  id: string;
  url: string;
};

type BoardImageUploaderProps = {
  initialImages?: InitialImage[];
};

type ImageItem = {
  clientKey: string;
  id: string;
  url: string;
  previewUrl: string;
  status: "uploading" | "ready";
};

function clientKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function responseError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error.trim();
  }
  return fallback;
}

export function BoardImageUploader({
  initialImages = [],
}: BoardImageUploaderProps) {
  const inputId = useId();
  const initialIdsRef = useRef(
    new Set(initialImages.map((image) => image.id).filter(Boolean)),
  );
  const [images, setImages] = useState<ImageItem[]>(() =>
    initialImages
      .filter((image) => image.id.trim() && image.url.trim())
      .slice(0, MAX_IMAGES)
      .map((image, index) => ({
        clientKey: `initial-${image.id}-${index}`,
        id: image.id,
        url: image.url,
        previewUrl: "",
        status: "ready",
      })),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const imagesRef = useRef<ImageItem[]>([]);
  const uploadingRef = useRef(false);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      imagesRef.current.forEach((image) => {
        if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    const form = formRef.current?.closest("form");
    if (!form) return;

    const preventSubmitWhileUploading = (event: Event) => {
      if (!uploadingRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      setError("이미지 업로드가 끝난 뒤 등록해 주세요.");
    };

    // The uploader is a sibling of the submit button, so a local onSubmit
    // handler would not reliably see the parent's submit event.
    form.addEventListener("submit", preventSubmitWhileUploading, true);
    return () => form.removeEventListener("submit", preventSubmitWhileUploading, true);
  }, []);

  function replaceUploadingItem(
    itemKey: string,
    update: (item: ImageItem) => ImageItem,
  ) {
    setImages((current) =>
      current.map((item) => (item.clientKey === itemKey ? update(item) : item)),
    );
  }

  async function uploadFiles(files: File[]) {
    if (uploading || files.length === 0) return;

    const available = MAX_IMAGES - images.length;
    if (available <= 0) {
      setError(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있어요.`);
      return;
    }

    const selectedFiles = files.slice(0, available);
    if (files.length > available) {
      setError(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있어요.`);
    } else {
      setError("");
    }

    const validFiles = selectedFiles.filter((file) => {
      if (!ACCEPTED_TYPES.has(file.type)) {
        setError("JPG, PNG, WebP 이미지만 첨부할 수 있어요.");
        return false;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError("이미지는 장당 5MB 이하만 첨부할 수 있어요.");
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    uploadingRef.current = true;
    setUploading(true);

    try {
      // Sequential uploads keep the visible order identical to the user's
      // selection order and avoid competing with the mobile connection.
      for (const file of validFiles) {
        const localPreviewUrl = URL.createObjectURL(file);
        const itemKey = clientKey();
        if (mountedRef.current) {
          setImages((current) => [
            ...current,
            {
              clientKey: itemKey,
              id: "",
              url: "",
              previewUrl: localPreviewUrl,
              status: "uploading",
            },
          ]);
        }

        try {
          const body = new FormData();
          body.append("file", file);
          const response = await fetch("/api/board/images", {
            method: "POST",
            body,
            signal: controller.signal,
          });
          const payload = (await response.json().catch(() => null)) as
            | { id?: unknown; url?: unknown; error?: unknown }
            | null;
          const id = typeof payload?.id === "string" ? payload.id.trim() : "";
          const url = typeof payload?.url === "string" ? payload.url.trim() : "";
          if (!response.ok || !id || !url) {
            throw new Error(responseError(payload, "이미지 업로드에 실패했어요."));
          }

          if (mountedRef.current) {
            replaceUploadingItem(itemKey, (item) => ({
              ...item,
              id,
              url,
              previewUrl: "",
              status: "ready",
            }));
          }
          URL.revokeObjectURL(localPreviewUrl);
        } catch (uploadFailure) {
          URL.revokeObjectURL(localPreviewUrl);
          if (uploadFailure instanceof DOMException && uploadFailure.name === "AbortError") {
            throw uploadFailure;
          }
          if (mountedRef.current) {
            setImages((current) =>
              current.filter((item) => item.clientKey !== itemKey),
            );
            setError(
              uploadFailure instanceof Error && uploadFailure.message
                ? uploadFailure.message
                : "이미지 업로드에 실패했어요.",
            );
          }
        }
      }
    } catch (uploadFailure) {
      if (!(uploadFailure instanceof DOMException && uploadFailure.name === "AbortError")) {
        if (mountedRef.current) {
          setError("이미지 업로드가 중단됐어요. 다시 시도해 주세요.");
        }
      }
    } finally {
      abortControllerRef.current = null;
      uploadingRef.current = false;
      if (mountedRef.current) setUploading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void uploadFiles(files);
  }

  async function removeImage(image: ImageItem, index: number) {
    if (uploading || image.status !== "ready" || !image.id) return;

    setError("");
    setImages((current) => current.filter((item) => item.clientKey !== image.clientKey));
    if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);

    // Existing attachments are removed from the submitted list only. The
    // server cleans those files up after the edit is saved.
    if (initialIdsRef.current.has(image.id)) return;

    try {
      const response = await fetch("/api/board/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: image.id }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseError(payload, "이미지 삭제에 실패했어요."));
      }
    } catch (deleteFailure) {
      if (!mountedRef.current) return;
      setImages((current) => {
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, image);
        return next;
      });
      setError(
        deleteFailure instanceof Error && deleteFailure.message
          ? deleteFailure.message
          : "이미지 삭제에 실패했어요.",
      );
    }
  }

  return (
    <div className="board-image-uploader" ref={formRef}>
      <div className="board-image-uploader__head">
        <div>
          <strong>사진 첨부</strong>
          <span>{images.length} / {MAX_IMAGES}</span>
        </div>
        <label className="board-image-uploader__add" htmlFor={inputId}>
          {uploading ? "업로드 중…" : "사진 추가"}
          <input
            id={inputId}
            className="board-image-uploader__input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading || images.length >= MAX_IMAGES}
            onChange={handleFileChange}
            aria-describedby={`${inputId}-hint`}
          />
        </label>
      </div>
      <p className="board-image-uploader__hint" id={`${inputId}-hint`}>
        JPG, PNG, WebP · 장당 5MB 이하 · 최대 {MAX_IMAGES}장<br />
        공개 게시판에 표시되니 개인정보가 보이는 사진은 피해주세요.
      </p>
      <p className="board-image-uploader__status" role="status" aria-live="polite">
        {uploading ? "이미지를 업로드하고 있어요. 잠시만 기다려 주세요." : ""}
      </p>
      {error && <p className="board-image-uploader__error" role="alert" aria-live="assertive">{error}</p>}

      {images.length > 0 && (
        <ul className="board-image-uploader__grid" aria-label="첨부 이미지 목록">
          {images.map((image, index) => (
            <li className="board-image-uploader__item" key={image.clientKey}>
              <figure>
                {/* Board attachments use opaque public storage URLs without profile identifiers. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.previewUrl || image.url}
                  alt={`첨부 이미지 ${index + 1} 미리보기`}
                />
                {image.status === "uploading" && (
                  <span className="board-image-uploader__loading" aria-hidden="true">업로드 중…</span>
                )}
              </figure>
              {image.status === "ready" && image.id && (
                <input type="hidden" name="imageId" value={image.id} />
              )}
              <div className="board-image-uploader__item-footer">
                <span>{index + 1}번 이미지</span>
                <button
                  type="button"
                  className="board-image-uploader__remove"
                  disabled={uploading || image.status !== "ready"}
                  onClick={() => void removeImage(image, index)}
                  aria-label={`${index + 1}번 이미지 삭제`}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
