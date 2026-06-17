import { Outlet, createRootRoute } from "@tanstack/react-router";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Hero from "../components/Hero";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function RootComponent() {
  return (
    <div className="app">
      <Navbar />
      <Hero>
        <Outlet />
      </Hero>
      <Footer />
    </div>
  );
}

function NotFoundPage() {
  return (
    <section className="hero">
      <p className="hero-preheader">Error 404 - Page not found</p>
      <h1 className="hero-headline">Nobody lives here.</h1>
      <div className="hero-message">
        <p>
          Whatever you were looking for, it's not at this address. It may have
          moved, been deleted, or never existed.
        </p>
        <p>
          You may have mis-typed the URL or simply clicked on a broken link.
          Links are CAse SeNsiTivE, so double check that everything is correct
          and try again.
        </p>
      </div>
    </section>
  );
}
