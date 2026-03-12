import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Settings, 
  Key, 
  Globe, 
  Bot, 
  Clock,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  AlertTriangle,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Users,
  Cloud,
  Book,
  ExternalLink,
  LogOut,
  UserPlus,
  UserMinus
} from "lucide-react";
import { toast } from "sonner";
import { 
  getConfig, 
  updateConfig, 
  adminLogin, 
  adminVerify,
  addDomain,
  removeDomain,
  authorizeTelegramUser,
  revokeTelegramUser
} from "../lib/api";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

const AdminPage = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  const [showCloudflareToken, setShowCloudflareToken] = useState(false);
  
  const [formData, setFormData] = useState({
    resend_api_key: "",
    telegram_bot_token: "",
    default_expiration_hours: "",
    website_auth_enabled: false,
    telegram_auth_enabled: false,
    cloudflare_api_token: "",
    cloudflare_account_id: "",
  });

  const [newDomain, setNewDomain] = useState({ domain: "", provider: "resend", is_default: false });
  const [newAuthorizedUser, setNewAuthorizedUser] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      try {
        await adminVerify();
        setIsAuthenticated(true);
        loadConfig();
      } catch (error) {
        localStorage.removeItem("admin_token");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const result = await adminLogin(password);
      localStorage.setItem("admin_token", result.token);
      setIsAuthenticated(true);
      toast.success("Login successful");
      loadConfig();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid password");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAuthenticated(false);
    setConfig(null);
    toast.success("Logged out");
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getConfig();
      setConfig(data);
      setFormData({
        resend_api_key: "",
        telegram_bot_token: "",
        default_expiration_hours: data.default_expiration_hours?.toString() || "",
        website_auth_enabled: data.website_auth_enabled || false,
        telegram_auth_enabled: data.telegram_auth_enabled || false,
        cloudflare_api_token: "",
        cloudflare_account_id: data.cloudflare_account_id || "",
      });
    } catch (error) {
      toast.error("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {};
      
      if (formData.resend_api_key?.trim()) {
        updateData.resend_api_key = formData.resend_api_key.trim();
      }
      if (formData.telegram_bot_token?.trim()) {
        updateData.telegram_bot_token = formData.telegram_bot_token.trim();
      }
      if (formData.cloudflare_api_token?.trim()) {
        updateData.cloudflare_api_token = formData.cloudflare_api_token.trim();
      }
      if (formData.cloudflare_account_id?.trim()) {
        updateData.cloudflare_account_id = formData.cloudflare_account_id.trim();
      }
      
      updateData.website_auth_enabled = formData.website_auth_enabled;
      updateData.telegram_auth_enabled = formData.telegram_auth_enabled;
      
      if (formData.default_expiration_hours) {
        updateData.default_expiration_hours = parseInt(formData.default_expiration_hours);
      } else {
        updateData.default_expiration_hours = null;
      }

      await updateConfig(updateData);
      toast.success("Configuration saved");
      loadConfig();
      
      setFormData(prev => ({
        ...prev,
        resend_api_key: "",
        telegram_bot_token: "",
        cloudflare_api_token: "",
      }));
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.domain.trim()) {
      toast.error("Please enter a domain");
      return;
    }
    
    try {
      await addDomain(newDomain);
      toast.success("Domain added");
      setNewDomain({ domain: "", provider: "resend", is_default: false });
      loadConfig();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add domain");
    }
  };

  const handleRemoveDomain = async (domain) => {
    try {
      await removeDomain(domain);
      toast.success("Domain removed");
      loadConfig();
    } catch (error) {
      toast.error("Failed to remove domain");
    }
  };

  const handleAuthorizeUser = async () => {
    if (!newAuthorizedUser.trim()) {
      toast.error("Please enter a chat ID");
      return;
    }
    
    try {
      await authorizeTelegramUser(parseInt(newAuthorizedUser));
      toast.success("User authorized");
      setNewAuthorizedUser("");
      loadConfig();
    } catch (error) {
      toast.error("Failed to authorize user");
    }
  };

  const handleRevokeUser = async (chatId) => {
    try {
      await revokeTelegramUser(chatId);
      toast.success("User authorization revoked");
      loadConfig();
    } catch (error) {
      toast.error("Failed to revoke user");
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="cyber-card">
            <div className="cyber-card-header">
              <div className="terminal-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-xs text-gray-400 tracking-widest uppercase">Admin Access</span>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 text-neon-green mx-auto mb-3" />
                <h2 className="text-xl font-display text-neon-green uppercase tracking-wider">
                  Admin Login
                </h2>
                <p className="text-xs text-gray-500 mt-2">Enter admin password to continue</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="cyber-input w-full"
                    data-testid="input-admin-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loggingIn}
                  className="cyber-btn cyber-btn-primary w-full flex items-center justify-center gap-2"
                  data-testid="btn-admin-login"
                >
                  {loggingIn ? (
                    <>
                      <div className="spinner" />
                      <span>AUTHENTICATING...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>LOGIN</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-display uppercase tracking-wider text-neon-green text-glow flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Admin Configuration
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            Configure your GhostMail instance
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="cyber-btn flex items-center gap-2"
          data-testid="btn-logout"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-4 gap-2 bg-transparent">
          {[
            { value: "general", label: "General", icon: Settings },
            { value: "domains", label: "Domains", icon: Globe },
            { value: "security", label: "Security", icon: Shield },
            { value: "guide", label: "Guide", icon: Book },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="cyber-btn data-[state=active]:cyber-btn-primary flex items-center gap-2 justify-center"
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card"
          >
            <div className="cyber-card-header">
              <div className="terminal-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-xs text-gray-400 tracking-widest uppercase">API Configuration</span>
            </div>

            <div className="p-6 space-y-6">
              {/* Resend API Key */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest">
                  <Key className="w-4 h-4 text-neon-green" />
                  Resend API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={formData.resend_api_key}
                    onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
                    placeholder={config?.resend_api_key || "Enter Resend API key"}
                    className="cyber-input w-full pr-10"
                    data-testid="input-resend-key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-neon-green"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Telegram Bot Token */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest">
                  <Bot className="w-4 h-4 text-neon-blue" />
                  Telegram Bot Token
                </label>
                <div className="relative">
                  <input
                    type={showBotToken ? "text" : "password"}
                    value={formData.telegram_bot_token}
                    onChange={(e) => setFormData({ ...formData, telegram_bot_token: e.target.value })}
                    placeholder={config?.telegram_bot_token || "Enter Telegram bot token"}
                    className="cyber-input w-full pr-10"
                    data-testid="input-telegram-token"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBotToken(!showBotToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-neon-green"
                  >
                    {showBotToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Cloudflare API Token */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest">
                  <Cloud className="w-4 h-4 text-orange-500" />
                  Cloudflare API Token (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showCloudflareToken ? "text" : "password"}
                    value={formData.cloudflare_api_token}
                    onChange={(e) => setFormData({ ...formData, cloudflare_api_token: e.target.value })}
                    placeholder={config?.cloudflare_api_token || "Enter Cloudflare API token"}
                    className="cyber-input w-full pr-10"
                    data-testid="input-cloudflare-token"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCloudflareToken(!showCloudflareToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-neon-green"
                  >
                    {showCloudflareToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Cloudflare Account ID */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest">
                  <Cloud className="w-4 h-4 text-orange-500" />
                  Cloudflare Account ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.cloudflare_account_id}
                  onChange={(e) => setFormData({ ...formData, cloudflare_account_id: e.target.value })}
                  placeholder="Enter Cloudflare account ID"
                  className="cyber-input w-full"
                  data-testid="input-cloudflare-account"
                />
              </div>

              {/* Default Expiration */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest">
                  <Clock className="w-4 h-4 text-neon-green" />
                  Default Expiration (Hours)
                </label>
                <input
                  type="number"
                  value={formData.default_expiration_hours}
                  onChange={(e) => setFormData({ ...formData, default_expiration_hours: e.target.value })}
                  placeholder="Leave empty for no expiration"
                  className="cyber-input w-full"
                  data-testid="input-expiration"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="cyber-btn cyber-btn-primary w-full flex items-center justify-center gap-2"
                data-testid="btn-save"
              >
                {saving ? (
                  <>
                    <div className="spinner" />
                    <span>SAVING...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>SAVE CONFIGURATION</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Status */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card"
          >
            <div className="cyber-card-header">
              <div className="terminal-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400 tracking-widest uppercase">Status</span>
                <button onClick={loadConfig} className="text-gray-400 hover:text-neon-green">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <table className="cyber-table">
                <tbody>
                  <tr>
                    <td className="text-gray-500">Resend API</td>
                    <td>
                      {config?.resend_api_key ? (
                        <span className="cyber-badge cyber-badge-success">CONFIGURED</span>
                      ) : (
                        <span className="cyber-badge cyber-badge-danger">NOT SET</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500">Telegram Bot</td>
                    <td>
                      {config?.telegram_bot_token ? (
                        <span className="cyber-badge cyber-badge-success">CONFIGURED</span>
                      ) : (
                        <span className="cyber-badge cyber-badge-danger">NOT SET</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500">Cloudflare</td>
                    <td>
                      {config?.cloudflare_api_token ? (
                        <span className="cyber-badge cyber-badge-success">CONFIGURED</span>
                      ) : (
                        <span className="cyber-badge cyber-badge-warning">OPTIONAL</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500">Website Auth</td>
                    <td>
                      {config?.website_auth_enabled ? (
                        <span className="cyber-badge cyber-badge-success">ENABLED</span>
                      ) : (
                        <span className="cyber-badge cyber-badge-warning">DISABLED</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500">Telegram Auth</td>
                    <td>
                      {config?.telegram_auth_enabled ? (
                        <span className="cyber-badge cyber-badge-success">ENABLED</span>
                      ) : (
                        <span className="cyber-badge cyber-badge-warning">DISABLED</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card"
          >
            <div className="cyber-card-header">
              <div className="terminal-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-xs text-gray-400 tracking-widest uppercase">Email Domains</span>
            </div>

            <div className="p-6 space-y-6">
              {/* Add Domain */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={newDomain.domain}
                    onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
                    placeholder="example.com"
                    className="cyber-input"
                    data-testid="input-new-domain"
                  />
                  <select
                    value={newDomain.provider}
                    onChange={(e) => setNewDomain({ ...newDomain, provider: e.target.value })}
                    className="cyber-input"
                  >
                    <option value="resend">Resend</option>
                    <option value="cloudflare">Cloudflare</option>
                  </select>
                  <button
                    onClick={handleAddDomain}
                    className="cyber-btn cyber-btn-primary flex items-center justify-center gap-2"
                    data-testid="btn-add-domain"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ADD DOMAIN</span>
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={newDomain.is_default}
                    onChange={(e) => setNewDomain({ ...newDomain, is_default: e.target.checked })}
                    className="accent-neon-green"
                  />
                  Set as default domain
                </label>
              </div>

              {/* Domain List */}
              <div className="space-y-2">
                <h3 className="text-xs text-gray-500 uppercase tracking-widest">Active Domains</h3>
                {config?.email_domains?.map((d, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 border border-neon-green/10 hover:border-neon-green/30"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-neon-green" />
                      <span className="text-neon-green">{d.domain}</span>
                      {d.is_default && (
                        <span className="cyber-badge cyber-badge-success text-[8px]">DEFAULT</span>
                      )}
                      <span className="text-xs text-gray-600">{d.provider}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveDomain(d.domain)}
                      className="text-gray-500 hover:text-neon-pink"
                      data-testid={`btn-remove-domain-${i}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card"
          >
            <div className="cyber-card-header">
              <div className="terminal-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-xs text-gray-400 tracking-widest uppercase">Authorization Settings</span>
            </div>

            <div className="p-6 space-y-6">
              {/* Website Auth Toggle */}
              <div className="flex items-center justify-between p-4 border border-neon-green/20">
                <div>
                  <h3 className="text-neon-green font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website Authentication
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Require Telegram OTP to access the website
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFormData({ ...formData, website_auth_enabled: !formData.website_auth_enabled });
                  }}
                  className={`cyber-btn ${formData.website_auth_enabled ? 'cyber-btn-primary' : ''}`}
                  data-testid="btn-toggle-website-auth"
                >
                  {formData.website_auth_enabled ? (
                    <><Lock className="w-4 h-4 mr-2" /> ENABLED</>
                  ) : (
                    <><Unlock className="w-4 h-4 mr-2" /> DISABLED</>
                  )}
                </button>
              </div>

              {/* Telegram Auth Toggle */}
              <div className="flex items-center justify-between p-4 border border-neon-blue/20">
                <div>
                  <h3 className="text-neon-blue font-medium flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Telegram Bot Authorization
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Only authorized users can use the Telegram bot
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFormData({ ...formData, telegram_auth_enabled: !formData.telegram_auth_enabled });
                  }}
                  className={`cyber-btn ${formData.telegram_auth_enabled ? 'cyber-btn-primary' : ''}`}
                  data-testid="btn-toggle-telegram-auth"
                >
                  {formData.telegram_auth_enabled ? (
                    <><Lock className="w-4 h-4 mr-2" /> ENABLED</>
                  ) : (
                    <><Unlock className="w-4 h-4 mr-2" /> DISABLED</>
                  )}
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="cyber-btn cyber-btn-primary w-full flex items-center justify-center gap-2"
              >
                {saving ? <div className="spinner" /> : <Save className="w-4 h-4" />}
                <span>SAVE SECURITY SETTINGS</span>
              </button>
            </div>
          </motion.div>

          {/* Authorized Users */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card"
          >
            <div className="cyber-card-header">
              <div className="terminal-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-xs text-gray-400 tracking-widest uppercase">Authorized Telegram Users</span>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500">
                Users must use /myid in the bot to get their chat ID
              </p>

              <div className="flex gap-4">
                <input
                  type="text"
                  value={newAuthorizedUser}
                  onChange={(e) => setNewAuthorizedUser(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter Telegram Chat ID"
                  className="cyber-input flex-1"
                  data-testid="input-authorize-user"
                />
                <button
                  onClick={handleAuthorizeUser}
                  className="cyber-btn cyber-btn-primary flex items-center gap-2"
                  data-testid="btn-authorize-user"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>ADD</span>
                </button>
              </div>

              <div className="space-y-2">
                {config?.authorized_telegram_users?.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No authorized users. All users have access when Telegram auth is disabled.
                  </p>
                ) : (
                  config?.authorized_telegram_users?.map((chatId, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-3 border border-neon-green/10"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-neon-green" />
                        <span className="text-gray-300">{chatId}</span>
                      </div>
                      <button
                        onClick={() => handleRevokeUser(chatId)}
                        className="text-gray-500 hover:text-neon-pink flex items-center gap-1 text-xs"
                        data-testid={`btn-revoke-user-${chatId}`}
                      >
                        <UserMinus className="w-4 h-4" />
                        REVOKE
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Guide Tab */}
        <TabsContent value="guide" className="space-y-6">
          {/* Resend Setup */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card"
          >
            <div className="cyber-card-header border-neon-green/20 bg-neon-green/5">
              <div className="terminal-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-xs text-neon-green tracking-widest uppercase">Resend Setup Guide</span>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <ol className="list-decimal list-inside space-y-3 text-gray-400">
                <li>Create account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline">resend.com <ExternalLink className="w-3 h-3 inline" /></a></li>
                <li>Go to <b>Domains</b> → <b>Add Domain</b> and verify your domain</li>
                <li>Go to <b>API Keys</b> → <b>Create API Key</b></li>
                <li>Copy the API key and paste in General → Resend API Key</li>
                <li>Go to <b>Webhooks</b> → <b>Add Webhook</b></li>
                <li>Set webhook URL to: <code className="text-neon-blue bg-black/50 px-2 py-1 text-xs">{window.location.origin}/api/webhook/resend</code></li>
                <li>Select event: <b>email.received</b></li>
              </ol>
            </div>
          </motion.div>

          {/* Telegram Setup */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card"
          >
            <div className="cyber-card-header border-neon-blue/20 bg-neon-blue/5">
              <div className="terminal-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-xs text-neon-blue tracking-widest uppercase">Telegram Bot Setup Guide</span>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <ol className="list-decimal list-inside space-y-3 text-gray-400">
                <li>Open Telegram and message <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline">@BotFather <ExternalLink className="w-3 h-3 inline" /></a></li>
                <li>Send <code className="text-neon-green">/newbot</code> command</li>
                <li>Choose a name for your bot (e.g., "GhostMail Bot")</li>
                <li>Choose a username ending in "bot" (e.g., "ghostmail_bot")</li>
                <li>Copy the API token and paste in General → Telegram Bot Token</li>
                <li>Webhook will be automatically configured</li>
              </ol>
              
              <div className="mt-4 p-3 border border-neon-blue/20">
                <h4 className="text-neon-blue font-medium mb-2">Bot Commands:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><code>/start</code> - Initialize & register</div>
                  <div><code>/generate</code> - Create temp email</div>
                  <div><code>/list</code> - Show active emails</div>
                  <div><code>/inbox</code> - Check inbox</div>
                  <div><code>/delete</code> - Delete email</div>
                  <div><code>/send</code> - Send email</div>
                  <div><code>/myid</code> - Get login credentials</div>
                  <div><code>/authorize</code> - Authorize user (admin)</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Cloudflare Setup */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card"
          >
            <div className="cyber-card-header border-orange-500/20 bg-orange-500/5">
              <div className="terminal-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-xs text-orange-500 tracking-widest uppercase">Cloudflare Email Routing (Optional)</span>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="p-3 border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Cloudflare Email Routing is an optional alternative/backup for receiving emails. Use it for load balancing or as a fallback.
              </div>
              
              <ol className="list-decimal list-inside space-y-3 text-gray-400">
                <li>Login to <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline">Cloudflare Dashboard <ExternalLink className="w-3 h-3 inline" /></a></li>
                <li>Select your domain → <b>Email</b> → <b>Email Routing</b></li>
                <li>Enable Email Routing for your domain</li>
                <li>Go to <b>Routing Rules</b> → <b>Catch-all address</b></li>
                <li>Set action to <b>Send to a Worker</b> or <b>Forward to webhook</b></li>
                <li>Webhook URL: <code className="text-orange-500 bg-black/50 px-2 py-1 text-xs">{window.location.origin}/api/webhook/cloudflare</code></li>
                <li>Get API Token: <b>My Profile</b> → <b>API Tokens</b> → <b>Create Token</b></li>
                <li>Select <b>Edit zone DNS</b> template or create custom with Email Routing permissions</li>
                <li>Copy Account ID from dashboard URL or right sidebar</li>
              </ol>
            </div>
          </motion.div>

          {/* Webhook URLs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card"
          >
            <div className="cyber-card-header">
              <div className="terminal-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-xs text-gray-400 tracking-widest uppercase">Webhook URLs</span>
            </div>

            <div className="p-6 space-y-3 font-mono text-xs">
              <div>
                <span className="text-gray-500">Resend Webhook:</span>
                <code className="block text-neon-green mt-1 bg-black/50 p-2 break-all">{window.location.origin}/api/webhook/resend</code>
              </div>
              <div>
                <span className="text-gray-500">Cloudflare Webhook:</span>
                <code className="block text-orange-500 mt-1 bg-black/50 p-2 break-all">{window.location.origin}/api/webhook/cloudflare</code>
              </div>
              <div>
                <span className="text-gray-500">Telegram Webhook (auto-configured):</span>
                <code className="block text-neon-blue mt-1 bg-black/50 p-2 break-all">{window.location.origin}/api/webhook/telegram/[secret]</code>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
