/**
 * The dotted texture behind the editor's sliders.
 *
 * This used to be /figma-icons/slider-grid.svg: 1.2 MB holding 4,745 separate
 * circle paths, rasterised behind every slider on first paint. The pattern is a
 * regular grid, so a tiled radial gradient draws the same thing for free. The
 * box, offset and grid metrics match the Figma export exactly (0.71 px dots,
 * 8.228 x 6.662 px pitch, #E6E6E6 at 10%).
 */
export function SliderDotGrid({ offsetX }: { offsetX: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: `calc(50% + ${offsetX}px)`,
        top: 'calc(50% + 0.5px)',
        width: 528,
        height: 481,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        backgroundImage:
          'radial-gradient(circle at 0.71px 0.71px, rgba(230,230,230,0.1) 0.71px, transparent 0.9px)',
        backgroundSize: '8.228px 6.662px',
      }}
    />
  )
}
