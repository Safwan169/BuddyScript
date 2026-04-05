import assert from 'node:assert/strict';
import {
  resolveSessionBootstrapAction,
  shouldRedirectAuthPage,
  shouldRedirectProtected,
} from '../lib/authFlow';
import { mergeUniqueById } from '../lib/cursorPagination';

const run = () => {
  assert.equal(
    resolveSessionBootstrapAction({
      isAuthPage: false,
      authChecked: false,
      isSuccess: true,
      isError: false,
      hasData: true,
    }),
    'setSession'
  );

  assert.equal(
    resolveSessionBootstrapAction({
      isAuthPage: false,
      authChecked: false,
      isSuccess: false,
      isError: true,
      hasData: false,
      errorStatus: 401,
    }),
    'clearAuth'
  );

  assert.equal(
    resolveSessionBootstrapAction({
      isAuthPage: false,
      authChecked: false,
      isSuccess: false,
      isError: true,
      hasData: false,
      errorStatus: 404,
    }),
    'markChecked'
  );

  assert.equal(
    resolveSessionBootstrapAction({
      isAuthPage: true,
      authChecked: false,
      isSuccess: false,
      isError: false,
      hasData: false,
    }),
    'markChecked'
  );

  assert.equal(shouldRedirectProtected({ authChecked: true, isAuthenticated: false }), true);
  assert.equal(shouldRedirectProtected({ authChecked: false, isAuthenticated: false }), false);

  assert.equal(shouldRedirectAuthPage({ authChecked: true, isAuthenticated: true }), true);
  assert.equal(shouldRedirectAuthPage({ authChecked: true, isAuthenticated: false }), false);

  const firstPage = [
    { id: '1', text: 'a' },
    { id: '2', text: 'b' },
  ];
  const secondPage = [
    { id: '2', text: 'b-duplicate' },
    { id: '3', text: 'c' },
  ];

  const merged = mergeUniqueById(firstPage, secondPage);
  assert.deepEqual(merged, [
    { id: '1', text: 'a' },
    { id: '2', text: 'b' },
    { id: '3', text: 'c' },
  ]);

  console.log('Frontend logic tests passed.');
};

run();
