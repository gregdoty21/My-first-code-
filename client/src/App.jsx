import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Wardrobe from "./pages/Wardrobe.jsx";
import Trips from "./pages/Trips.jsx";
import TripDetail from "./pages/TripDetail.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <nav className="nav">
      <Link className="nav__brand" to="/wardrobe">Pack</Link>
      <div className="nav__links">
        <Link to="/wardrobe">Wardrobe</Link>
        <Link to="/trips">Trips</Link>
      </div>
      <div className="nav__user">
        <span>{user.name}</span>
        <button
          type="button"
          className="link-button"
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/wardrobe"
            element={
              <Protected>
                <Wardrobe />
              </Protected>
            }
          />
          <Route
            path="/trips"
            element={
              <Protected>
                <Trips />
              </Protected>
            }
          />
          <Route
            path="/trips/:id"
            element={
              <Protected>
                <TripDetail />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/wardrobe" replace />} />
        </Routes>
      </main>
    </>
  );
}
