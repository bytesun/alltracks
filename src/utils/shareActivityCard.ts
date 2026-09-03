import html2canvas from 'html2canvas';

export type ActivityCardShareResult = 'shared' | 'downloaded';

const safeFilename = (value: string) =>
  value
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'alltracks-activity';

export const shareActivityCard = async (
  element: HTMLElement | null,
  name: string,
  shareText: string,
): Promise<ActivityCardShareResult> => {
  if (!element) throw new Error('Activity card is not ready yet.');

  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: Math.max(2, Math.min(3, window.devicePixelRatio || 1)),
    logging: false,
    useCORS: true,
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
  if (!blob) throw new Error('Unable to create the activity card image.');

  const filename = `${safeFilename(name)}-alltracks.png`;
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    await nav.share({
      title: name,
      text: shareText,
      files: [file],
    });
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }

  return 'downloaded';
};
