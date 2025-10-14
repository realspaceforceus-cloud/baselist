import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthDialogView = "signIn" | "forgot" | "reset";

type AuthDialogState = {
  isOpen: boolean;
  view: AuthDialogView;
  resetToken: string | null;
  resetEmail: string | null;
};

type AuthDialogContextValue = {
  state: AuthDialogState;
  openSignIn: () => void;
  openForgot: () => void;
  openReset: (token: string, email: string) => void;
  close: () => void;
  setView: (view: AuthDialogView) => void;
};

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export const AuthDialogProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [state, setState] = useState<AuthDialogState>({
    isOpen: false,
    view: "signIn",
    resetToken: null,
    resetEmail: null,
  });

  const openSignIn = useCallback(() => {
    setState({ isOpen: true, view: "signIn", resetToken: null, resetEmail: null });
  }, []);

  const openForgot = useCallback(() => {
    setState({ isOpen: true, view: "forgot", resetToken: null, resetEmail: null });
  }, []);

  const openReset = useCallback((token: string, email: string) => {
    setState({ isOpen: true, view: "reset", resetToken: token, resetEmail: email });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const setView = useCallback((view: AuthDialogView) => {
    setState((prev) => ({ ...prev, view }));
  }, []);

  const value = useMemo<AuthDialogContextValue>(
    () => ({ state, openSignIn, openForgot, openReset, close, setView }),
    [state, openSignIn, openForgot, openReset, close, setView],
  );

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
    </AuthDialogContext.Provider>
  );
};

export const useAuthDialog = (): AuthDialogContextValue => {
  const context = useContext(AuthDialogContext);
  if (!context) {
    throw new Error("useAuthDialog must be used within AuthDialogProvider");
  }
  return context;
};
