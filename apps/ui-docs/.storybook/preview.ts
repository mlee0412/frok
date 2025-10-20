import '../src/styles.css';

export const parameters = { layout: 'fullscreen' };

import * as React from 'react';

export const decorators = [
  (Story: any) =>
    React.createElement(
      'div',
      { className: 'min-h-screen p-8 container-app' },
      React.createElement(Story)
    ),
];
