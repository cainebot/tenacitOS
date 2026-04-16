import * as React from 'react'

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
}

const Grid2x2Block: React.FC<IconProps> = ({ size = 24, color = 'currentColor', ...props }) =>
  React.createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      stroke: color,
      strokeWidth: '2',
      fill: 'none',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      ...props,
    },
    React.createElement('path', { d: 'M12 3v17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H3' }),
    React.createElement('circle', { cx: '18.5', cy: '18.5', r: '3.5' }),
    React.createElement('path', { d: 'M16 16l5 5' }),
  )

Grid2x2Block.displayName = 'Grid2x2Block'

export { Grid2x2Block }
