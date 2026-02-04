import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const Signup = lazy(() => import("./Signup"));
const Login = lazy(() => import("./Login"));
const WalletPage = lazy(() => import("./WalletPage"));
const NFTPage = lazy(() => import("./NFTPage"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Signup />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <WalletPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/nft"
            element={
              <ProtectedRoute>
                <NFTPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;