export type SessionBootstrapInput = {
  isAuthPage: boolean;
  authChecked: boolean;
  isSuccess: boolean;
  isError: boolean;
  hasData: boolean;
  errorStatus?: number | string;
};

export type SessionBootstrapAction = 'setSession' | 'clearAuth' | 'markChecked' | 'none';

export const resolveSessionBootstrapAction = ({
  isAuthPage,
  authChecked,
  isSuccess,
  isError,
  hasData,
  errorStatus,
}: SessionBootstrapInput): SessionBootstrapAction => {
  if (isSuccess && hasData) {
    return 'setSession';
  }

  if (isError) {
    if (errorStatus === 401 || errorStatus === 403) {
      return 'clearAuth';
    }

    return 'markChecked';
  }

  if (isAuthPage && !authChecked) {
    return 'markChecked';
  }

  return 'none';
};

export const shouldRedirectProtected = ({
  authChecked,
  isAuthenticated,
}: {
  authChecked: boolean;
  isAuthenticated: boolean;
}): boolean => {
  return authChecked && !isAuthenticated;
};

export const shouldRedirectAuthPage = ({
  authChecked,
  isAuthenticated,
}: {
  authChecked: boolean;
  isAuthenticated: boolean;
}): boolean => {
  return authChecked && isAuthenticated;
};
