import { AdminPage } from "./pages/AdminPage";
import { PublicPage } from "./pages/PublicPage";

export function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/admin" ? <AdminPage /> : <PublicPage />;
}
