import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import HomePage from "./pages/HomePage";
import InboxPage from "./pages/InboxPage";
import EmailDetailPage from "./pages/EmailDetailPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-cyber-black font-mono">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#121212',
            border: '1px solid rgba(0, 255, 65, 0.3)',
            color: '#00ff41',
            fontFamily: 'JetBrains Mono, monospace',
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="inbox/:emailId" element={<InboxPage />} />
            <Route path="email/:messageId" element={<EmailDetailPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
