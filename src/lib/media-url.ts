const FETCH_TIMEOUT_MS = 15000;
const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 2048;
const IMAGE_MIN_QUALITY = 0.72;
const IMAGE_QUALITY_STEP = 0.08;

export const isYouTubeUrl = (url: string) =>
  /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)/i.test(url);

export const getUrlDisplayName = (url: string, fallback: string) => {
  try {
    const parsedUrl = new URL(url);
    const fileName = decodeURIComponent(parsedUrl.pathname.split("/").filter(Boolean).pop() || "");
    return fileName || parsedUrl.hostname || fallback;
  } catch {
    return fallback;
  }
};

export const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const splitDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    throw new Error("Failed to prepare the linked media.");
  }

  return {
    mimeType: match[1] || "application/octet-stream",
    base64: match[2],
  };
};

export const fetchRemoteBlob = async (url: string, accept = "*/*") => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: accept },
      mode: "cors",
      credentials: "omit",
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`This link returned ${response.status}.`);
    }

    const headerContentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (headerContentType.includes("text/html")) {
      throw new Error("This link points to a web page, not a direct media file.");
    }

    const blob = await response.blob();
    const blobType = (blob.type || headerContentType).toLowerCase();

    if (!blob.size) {
      throw new Error("This link returned an empty file.");
    }

    if (!blobType || blobType.includes("text/html")) {
      throw new Error("This link did not return a supported media file.");
    }

    return blobType === blob.type ? blob : new Blob([blob], { type: blobType });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The link took too long to respond. Try another URL or upload the file instead.");
    }

    if (error instanceof Error && error.message.startsWith("This link")) {
      throw error;
    }

    throw new Error("We couldn't access that link from the browser. Using the direct link fallback instead.");
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const loadImageFromBlob = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't process the linked image."));
    };

    image.src = objectUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Couldn't prepare the linked image."));
        return;
      }

      resolve(blob);
    }, type, quality);
  });

const optimizeImageBlob = async (blob: Blob) => {
  if (blob.size <= IMAGE_MAX_BYTES && blob.type !== "image/svg+xml") {
    return blob;
  }

  const image = await loadImageFromBlob(blob);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(width, height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Couldn't prepare the linked image.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.92;
  let optimizedBlob = await canvasToBlob(canvas, "image/jpeg", quality);

  while (optimizedBlob.size > IMAGE_MAX_BYTES && quality > IMAGE_MIN_QUALITY) {
    quality -= IMAGE_QUALITY_STEP;
    optimizedBlob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  return optimizedBlob;
};

export const fetchImageForAnalysis = async (url: string) => {
  const blob = await fetchRemoteBlob(url, "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");

  if (!blob.type.startsWith("image/")) {
    throw new Error("This link doesn't point to an image file.");
  }

  const optimizedBlob = await optimizeImageBlob(blob);
  const dataUrl = await blobToDataUrl(optimizedBlob);
  const { base64, mimeType } = splitDataUrl(dataUrl);

  return {
    base64,
    mimeType,
    previewUrl: dataUrl,
  };
};