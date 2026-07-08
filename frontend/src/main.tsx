import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

import "./index.css";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { Spinner } from "./components/ui/spinner.tsx";

const router = createRouter({
  routeTree,
  // https://tanstack.com/router/latest/docs/guide/authenticated-routes
  // auth will initially be undefined
  // We'll be passing down the auth state from within a React component
  context: { auth: undefined! },
});
const queryClient = new QueryClient();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Wrap RouterProvider in a React component in order to access state from auth hook
function App() {
  const auth = useAuth();
  // Don't render router until silent refresh completes
  if (auth.isLoading) return <Spinner />; // TODO: full page spinner
  return <RouterProvider router={router} context={{ auth }} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
