import * as Dialog from '@radix-ui/react-dialog';
import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyImageFallback } from '../utils/imageFallback';
export function ScreenshotGallery({ images, title }: { images: string[]; title: string }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const move = (delta: number) => setSelected(value => ((value ?? 0) + delta + images.length) % images.length);
  return <>
    <div className="screenshot-grid">{images.map((url, index) => <button type="button" key={url} onClick={() => setSelected(index)} aria-label={`${t('media.screenshots')} ${index + 1}`}><img src={url} alt="" loading="lazy" onError={event => applyImageFallback(event, [])} /></button>)}</div>
    <Dialog.Root open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}><Dialog.Portal><Dialog.Overlay className="trailer-overlay" /><Dialog.Content className="screenshot-dialog" aria-describedby={undefined} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); move(event.key === 'ArrowRight' ? 1 : -1); } }}>
      <Dialog.Title className="sr-only">{title} · {t('media.gallery')}</Dialog.Title><Dialog.Close className="trailer-dialog__close" aria-label={t('action.close')}><X size={24} /></Dialog.Close>
      {selected !== null ? <img src={images[selected]} alt={`${title} · ${selected + 1}`} onError={event => applyImageFallback(event, [])} /> : null}
      <div className="screenshot-dialog__controls"><button className="screen-tool" type="button" onClick={() => move(-1)} aria-label={t('media.previous')}><CaretLeft size={22} /></button><span>{(selected ?? 0) + 1} / {images.length}</span><button className="screen-tool" type="button" onClick={() => move(1)} aria-label={t('media.next')}><CaretRight size={22} /></button></div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
}
