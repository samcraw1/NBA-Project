import { useEffect, useState } from "react";

// Tiny router: the part after "#" is the route ("#/games/0022600287" -> "/games/0022600287").
// Links are plain <a href="#/..."> and the back button just works, with no extra dependency.
function readHash(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

export function useHashRoute(): string {
  const [route, setRoute] = useState(readHash);

  useEffect(() => {
    const onChange = () => setRoute(readHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}
