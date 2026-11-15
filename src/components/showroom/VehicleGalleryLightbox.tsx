import { useEffect, useRef, useState } from 'preact/hooks';

export interface GalleryImage {
  id: number;
  url: string;
  alt: string;
  width: number;
  height: number;
}

interface Props {
  vehicleTitle: string;
  images: GalleryImage[];
}

export default function VehicleGalleryLightbox({ vehicleTitle, images }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pointerDownOutsideRef = useRef(false);

  const safeImages =
    images.length > 0
      ? images
      : [{ id: 0, url: '/favicon.svg', alt: vehicleTitle, width: 1280, height: 854 }];

  const current = safeImages[activeIndex] ?? safeImages[0];

  const goPrev = () => {
    setActiveIndex((idx) => (idx - 1 + safeImages.length) % safeImages.length);
  };

  const goNext = () => {
    setActiveIndex((idx) => (idx + 1) % safeImages.length);
  };

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    const dlg = dialogRef.current;
    if (dlg && !dlg.open) {
      dlg.showModal();
    }
  };

  const closeLightbox = () => {
    const dlg = dialogRef.current;
    if (dlg && dlg.open) {
      dlg.close();
    }
  };

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!dlg.open) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };

    dlg.addEventListener('keydown', onKeyDown);
    return () => dlg.removeEventListener('keydown', onKeyDown);
  }, [safeImages.length]);

  const handleDialogPointerDown = (e: PointerEvent) => {
    const dlg = dialogRef.current;
    if (!dlg || "closedBy" in HTMLDialogElement.prototype) return;
    const rect = dlg.getBoundingClientRect();
    pointerDownOutsideRef.current =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
  };

  const handleDialogPointerUp = (e: PointerEvent) => {
    const dlg = dialogRef.current;
    if (!dlg || !pointerDownOutsideRef.current || "closedBy" in HTMLDialogElement.prototype) {
      return;
    }
    const rect = dlg.getBoundingClientRect();
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside && dlg.open) {
      dlg.close();
    }
    pointerDownOutsideRef.current = false;
  };

  return (
    <div>
      {/* Main Hero Frame */}
      <div class="relative overflow-hidden rounded-xl border border-border-subtle bg-surface">
        <button
          type="button"
          onClick={() => openLightbox(activeIndex)}
          aria-label={`Vollbild-Galerie öffnen: ${current.alt}`}
          data-lightbox-trigger
          class="group relative block aspect-[3/2] w-full cursor-zoom-in overflow-hidden text-left"
        >
          <img
            src={current.url}
            alt={current.alt}
            width={current.width || 1280}
            height={current.height || 854}
            fetchpriority="high"
            decoding="sync"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
          />
          <span class="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-md border border-border-subtle bg-canvas/85 px-3 py-1.5 font-mono text-xs font-medium text-ink backdrop-blur-sm transition-colors group-hover:border-gold group-hover:text-gold">
            <span>Vollbild ({activeIndex + 1}/{safeImages.length})</span>
          </span>
        </button>

        {safeImages.length > 1 && (
          <div class="pointer-events-none absolute inset-y-0 inset-x-3 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Vorheriges Fahrzeugbild"
              class="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-canvas/85 text-ink backdrop-blur-sm transition-colors hover:border-gold hover:text-gold"
            >
              ←
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Nächstes Fahrzeugbild"
              class="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-canvas/85 text-ink backdrop-blur-sm transition-colors hover:border-gold hover:text-gold"
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {safeImages.length > 1 && (
        <div
          class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4"
          role="group"
          aria-label="Fahrzeugbilder auswählen"
        >
          {safeImages.map((img, index) => {
            const isSelected = index === activeIndex;
            return (
              <button
                key={img.id || index}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Bild ${index + 1} anzeigen: ${img.alt}`}
                aria-pressed={isSelected}
                class={`relative aspect-[3/2] overflow-hidden rounded-lg border transition-all ${
                  isSelected
                    ? 'border-gold ring-2 ring-gold/40'
                    : 'border-border-subtle opacity-75 hover:border-border-control hover:opacity-100'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  width={420}
                  height={280}
                  loading="lazy"
                  decoding="async"
                  class="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Native Modal Lightbox (<dialog>) */}
      <dialog
        ref={dialogRef}
        closedby="any"
        aria-label={`Bildergalerie: ${vehicleTitle}`}
        class="lightbox-dialog rounded-xl"
        data-lightbox-dialog
        onPointerDown={handleDialogPointerDown}
        onPointerUp={handleDialogPointerUp}
      >
        <div class="flex items-center justify-between border-b border-border-subtle px-4 py-3 sm:px-6">
          <div class="flex items-center gap-3">
            <span
              class="rounded bg-surface px-2.5 py-1 font-mono text-xs text-gold"
              data-lightbox-counter
            >
              {activeIndex + 1} / {safeImages.length}
            </span>
            <p class="truncate text-sm font-medium text-ink">{vehicleTitle}</p>
          </div>
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Vollbild-Galerie schließen"
            data-lightbox-close
            class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border-control bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold"
          >
            Schließen (Esc)
          </button>
        </div>

        <div class="relative flex flex-1 items-center justify-center overflow-hidden bg-black p-2 sm:p-4">
          <img
            src={current.url}
            alt={current.alt}
            width={current.width || 1280}
            height={current.height || 854}
            class="max-h-[72svh] w-auto rounded object-contain"
          />

          {safeImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Vorheriges Bild in Vollbildansicht"
                data-lightbox-prev
                class="absolute left-3 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border-control bg-canvas/90 text-lg text-ink transition-colors hover:border-gold hover:text-gold"
              >
                ←
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Nächstes Bild in Vollbildansicht"
                data-lightbox-next
                class="absolute right-3 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border-control bg-canvas/90 text-lg text-ink transition-colors hover:border-gold hover:text-gold"
              >
                →
              </button>
            </>
          )}
        </div>

        <div class="border-t border-border-subtle px-4 py-2.5 text-center text-xs text-ink-muted sm:px-6">
          {current.alt}
        </div>
      </dialog>
    </div>
  );
}
