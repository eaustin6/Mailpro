import { useState, useEffect } from "react";
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
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { getConfig, updateConfig } from "../lib/api";

const AdminPage = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  
  const [formData, setFormData] = useState({
    resend_api_key: "",
    telegram_bot_token: "",
    email_domain: "",
    default_expiration_hours: "",
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getConfig();
      setConfig(data);
      setFormData({
        resend_api_key: "",
        telegram_bot_token: "",
        email_domain: data.email_domain || "",
        default_expiration_hours: data.default_expiration_hours?.toString() || "",
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
      
      if (formData.resend_api_key && formData.resend_api_key.trim()) {
        updateData.resend_api_key = formData.resend_api_key.trim();
      }
      if (formData.telegram_bot_token && formData.telegram_bot_token.trim()) {
        updateData.telegram_bot_token = formData.telegram_bot_token.trim();
      }
      if (formData.email_domain && formData.email_domain.trim()) {
        updateData.email_domain = formData.email_domain.trim();
      }
      if (formData.default_expiration_hours) {
        updateData.default_expiration_hours = parseInt(formData.default_expiration_hours);
      } else {
        updateData.default_expiration_hours = null;
      }

      await updateConfig(updateData);
      toast.success("Configuration saved successfully");
      loadConfig();
      
      // Clear sensitive fields
      setFormData(prev => ({
        ...prev,
        resend_api_key: "",
        telegram_bot_token: "",
      }));
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display uppercase tracking-wider text-neon-green text-glow flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Admin Configuration
        </h1>
        <p className="text-gray-500 text-sm mt-2">
          Configure your GhostMail instance settings
        </p>
      </motion.div>

      {/* Warning Banner */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="cyber-card border-yellow-500/30 bg-yellow-500/5"
      >
        <div className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-500 text-sm font-medium">Security Notice</p>
            <p className="text-gray-400 text-xs mt-1">
              API keys and tokens are sensitive. They will be masked after saving. 
              Only enter new values if you want to update them.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Configuration Form */}
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
          <span className="text-xs text-gray-400 tracking-widest uppercase">System Configuration</span>
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
                placeholder={config?.resend_api_key || "Enter your Resend API key"}
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
            <p className="text-xs text-gray-600">
              Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline">resend.com/api-keys</a>
            </p>
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
                placeholder={config?.telegram_bot_token || "Enter your Telegram bot token"}
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
            <p className="text-xs text-gray-600">
              Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline">@BotFather</a> on Telegram
            </p>
          </div>

          {/* Email Domain */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest">
              <Globe className="w-4 h-4 text-neon-green" />
              Email Domain
            </label>
            <input
              type="text"
              value={formData.email_domain}
              onChange={(e) => setFormData({ ...formData, email_domain: e.target.value })}
              placeholder="resend.dev"
              className="cyber-input w-full"
              data-testid="input-domain"
            />
            <p className="text-xs text-gray-600">
              Must be a domain verified in your Resend account
            </p>
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
            <p className="text-xs text-gray-600">
              Leave empty for no automatic expiration (default)
            </p>
          </div>

          {/* Save Button */}
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

      {/* Current Config Display */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="cyber-card"
      >
        <div className="cyber-card-header">
          <div className="terminal-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 tracking-widest uppercase">Current Status</span>
            <button 
              onClick={loadConfig}
              className="text-gray-400 hover:text-neon-green transition-colors"
            >
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
                <td className="text-gray-500">Email Domain</td>
                <td className="text-neon-green">{config?.email_domain || 'resend.dev'}</td>
              </tr>
              <tr>
                <td className="text-gray-500">Default Expiration</td>
                <td className="text-gray-300">
                  {config?.default_expiration_hours 
                    ? `${config.default_expiration_hours} hours`
                    : 'No expiration'}
                </td>
              </tr>
              <tr>
                <td className="text-gray-500">Webhook Secret</td>
                <td>
                  <code className="text-xs text-neon-blue bg-neon-blue/10 px-2 py-1">
                    {config?.webhook_secret?.slice(0, 16)}...
                  </code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Setup Guide */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="cyber-card border-neon-blue/30"
      >
        <div className="cyber-card-header border-neon-blue/20 bg-neon-blue/5">
          <div className="terminal-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="text-xs text-neon-blue tracking-widest uppercase">Setup Guide</span>
        </div>

        <div className="p-6 space-y-4 text-sm">
          <div className="space-y-2">
            <h3 className="text-neon-green font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              1. Configure Resend
            </h3>
            <ol className="list-decimal list-inside text-gray-400 space-y-1 text-xs ml-6">
              <li>Create account at resend.com</li>
              <li>Add and verify your domain</li>
              <li>Create API key and paste above</li>
              <li>Configure webhook to receive emails</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="text-neon-green font-medium flex items-center gap-2">
              <Bot className="w-4 h-4" />
              2. Setup Telegram Bot
            </h3>
            <ol className="list-decimal list-inside text-gray-400 space-y-1 text-xs ml-6">
              <li>Message @BotFather on Telegram</li>
              <li>Use /newbot command</li>
              <li>Copy the token and paste above</li>
              <li>Webhook will be set automatically</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="text-neon-green font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" />
              3. Webhook URLs
            </h3>
            <div className="bg-black/50 p-3 rounded text-xs font-mono">
              <p className="text-gray-500 mb-1"># Resend Webhook:</p>
              <p className="text-neon-blue break-all">{window.location.origin}/api/webhook/resend</p>
              <p className="text-gray-500 mt-3 mb-1"># Telegram Webhook (auto-configured):</p>
              <p className="text-neon-blue break-all">{window.location.origin}/api/webhook/telegram/[secret]</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminPage;
