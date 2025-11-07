/**
 * React 19 Compatibility Shim for @testing-library/react
 *
 * React 19 moved `act` from ReactDOMTestUtils to React itself.
 * This shim provides compatibility for @testing-library/react v16
 * which still expects ReactDOMTestUtils.act to exist.
 */

import React from 'react';

// Create a compatibility layer for react-dom/test-utils
if (typeof globalThis !== 'undefined' && !globalThis.IS_REACT_ACT_ENVIRONMENT) {
  // Set the global flag that React expects for test environments
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}

// Export the compatibility shim
export function setupReactActCompat() {
  // The act function is now on React itself in React 19
  const act = React.act || (() => {
    throw new Error('React.act is not available');
  });

  // Create a mock for ReactDOMTestUtils if it doesn't exist
  try {
    const ReactDOMTestUtils = require('react-dom/test-utils');
    if (!ReactDOMTestUtils.act) {
      ReactDOMTestUtils.act = act;
    }
  } catch (error) {
    // If react-dom/test-utils doesn't exist, we need to mock it
    const mockTestUtils = { act };

    // Override the require for react-dom/test-utils
    if (typeof jest !== 'undefined') {
      jest.mock('react-dom/test-utils', () => mockTestUtils);
    }
  }

  return act;
}

// Setup the compatibility layer immediately
setupReactActCompat();