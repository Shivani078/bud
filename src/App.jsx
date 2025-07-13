import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./auth/Login"; // adjust path as needed
import Products from "./pages/Products";
import { auth } from "./auth/firebase";
import { onAuthStateChanged } from "firebase/auth";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<Dashboard user={user} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/products" element={<Products user={user} />} />
      </Routes>
    </div>
  );
}

export default App;
