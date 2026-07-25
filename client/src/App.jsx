import { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import logo from "./assets/logo.png";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Wardrobe from "./pages/Wardrobe.jsx";
import Trips from "./pages/Trips.jsx";
import TripDetail from "./pages/TripDetail.jsx";
import TryOn from "./pages/TryOn.jsx";
import FashionProfile from "./pages/FashionProfile.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <nav className="nav">
      <Link className="nav__brand" to="/wardrobe">
        <img className="nav__logo" src={logo} alt="" />
        PackRat
      </Link>
      <div className="nav__links">
        <Link to="/wardrobe">Wardrobe</Link>
        <Link to="/trips">Trips</Link>
        <Link to="/try-on">Rat's Assistance</Link>
      </div>
      <div className="nav__settings" ref={menuRef}>
        <button type="button" className="nav__settings-trigger" onClick={() => setMenuOpen((o) => !o)}>
          {user.name}
          <span className="nav__settings-caret" aria-hidden="true">⚙</span>
        </button>
        {menuOpen && (
          <div className="nav__settings-menu">
            <Link to="/profile" onClick={() => setMenuOpen(false)}>My Fashion Profile</Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              Sign out
            </button>
          </div>
        )}
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
          <Route
            path="/try-on"
            element={
              <Protected>
                <TryOn />
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected>
                <FashionProfile />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/wardrobe" replace />} />
        </Routes>
      </main>
    </>
  );
}
