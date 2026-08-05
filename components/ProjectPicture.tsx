type ProjectPictureProps = {
  file: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  canvasSelector?: string;
  eager?: boolean;
};

const IMAGE_WIDTHS = [480, 768, 1024, 1440] as const;
type ImageFormat = "avif" | "webp" | "jpeg";

function imageUrl(file: string, width: (typeof IMAGE_WIDTHS)[number], format: ImageFormat) {
  const normalizedFile = file.replace(/^\/+/, "");
  return `/_image/${width}/${format}/${normalizedFile}`;
}

function imageSrcSet(file: string, format: ImageFormat) {
  return IMAGE_WIDTHS.map((width) => `${imageUrl(file, width, format)} ${width}w`).join(", ");
}

export function ProjectPicture({
  file,
  alt,
  width,
  height,
  className,
  sizes = "(max-width: 640px) 92vw, (max-width: 1024px) 48vw, 560px",
  canvasSelector,
  eager = false,
}: ProjectPictureProps) {
  return (
    <picture className={className} data-canvas-selector={canvasSelector}>
      <source type="image/avif" srcSet={imageSrcSet(file, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={imageSrcSet(file, "webp")} sizes={sizes} />
      <img
        src={imageUrl(file, 768, "jpeg")}
        srcSet={imageSrcSet(file, "jpeg")}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
      />
    </picture>
  );
}
