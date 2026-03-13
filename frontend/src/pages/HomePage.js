import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TypeAnimation } from "react-type-animation";
import { motion } from "framer-motion";
import { 
  Mail, 
  Copy, 
  RefreshCw, 
  Trash2, 
  Inbox, 
  Clock,
  Zap,
  Shield,
  Bot,
  ChevronRight,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { generateEmail, listEmails, deleteEmail, getStats, listDomains } from "../lib/api";

const HomePage = () => {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [customPrefix, setCustomPrefix] = useState("");
  const [expirationHours, setExpirationHours] = useState("");
  const [stats, setStats] = useState({ active_emails: 0, total_messages: 0, telegram_users: 0 });

  useEffect(() => {
    loadEmails();
    loadStats();
    loadDomains();

  }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const data = await listEmails();
      setEmails(data.emails || []);
    } catch (error) {
      toast.error("Failed to load emails");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats");
    }
  };

  const loadDomains = async () => {
    try {
      const data = await listDomains();
      setDomains(data.domains || []);
      if (data.domains?.length > 0 && !selectedDomain) {
        setSelectedDomain(data.domains[0]);
      }
    } catch (error) {
      console.error("Failed to load domains");
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = {
        custom_prefix: customPrefix || null,
        expiration_hours: expirationHours ? parseInt(expirationHours) : null,
        domain: selectedDomain || null,
      };
      const result = await generateEmail(data);
      if (result.status === "success") {
        toast.success("Email generated successfully");
        setCustomPrefix("");
        setExpirationHours("");
        loadEmails();
        loadStats();
      } else {
        toast.error(result.message || "Failed to generate email");
      }
    } catch (error) {
      toast.error("Failed to generate email");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Copied to clipboard");
    } catch (error) {
      // Fallback for browsers without clipboard API permission
      const textArea = document.createElement("textarea");
      textArea.value = email;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Copied to clipboard");
      } catch (err) {
        toast.error("Failed to copy to clipboard");
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDelete = async (emailId) => {
    try {
      await deleteEmail(emailId);
      toast.success("Email deleted");
      loadEmails();
      loadStats();
    } catch (error) {
      toast.error("Failed to delete email");
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <h1 className="font-display text-4xl md:text-6xl tracking-tighter text-neon-green text-glow uppercase mb-4">
          <TypeAnimation
            sequence={['GhostMail', 1000, 'Anonymous', 1000, 'Secure', 1000, 'GhostMail', 1000]}
            wrapper="span"
            speed={50}
            repeat={Infinity}
          />
        </h1>
        <p className="text-gray-400 text-sm md:text-base tracking-wide max-w-xl mx-auto">
          GENERATE DISPOSABLE EMAIL ADDRESSES. RECEIVE INSTANTLY. STAY ANONYMOUS.
        </p>
      </motion.div>

      {/* Stats Bar */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: "ACTIVE EMAILS", value: stats.active_emails, icon: Mail },
          { label: "MESSAGES", value: stats.total_messages, icon: Inbox },
          { label: "TELEGRAM USERS", value: stats.telegram_users, icon: Bot },
        ].map((stat, i) => (
          <div 
            key={stat.label}
            className="cyber-card p-4 text-center"
            data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}
          >
            <stat.icon className="w-5 h-5 text-neon-green mx-auto mb-2" />
            <div className="text-2xl font-bold text-neon-green text-glow">{stat.value}</div>
            <div className="text-xs text-gray-500 tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Generate Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="cyber-card"
      >
        <div className="cyber-card-header">
          <div className="terminal-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="text-xs text-gray-400 tracking-widest uppercase">Email Generator</span>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                Custom Prefix (Optional)
              </label>
              <input
                type="text"
                value={customPrefix}
                onChange={(e) => setCustomPrefix(e.target.value)}
                placeholder="e.g., shadow123"
                className="cyber-input w-full"
                data-testid="input-prefix"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                Expiration (Hours)
              </label>
              <input
                type="number"
                value={expirationHours}
                onChange={(e) => setExpirationHours(e.target.value)}
                placeholder="No expiration"
                className="cyber-input w-full"
                data-testid="input-expiration"
              />
            </div>
          </div>
          
          {/* Domain Selection */}
          {domains.length > 1 && (
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                <Globe className="w-3 h-3 inline mr-1" />
                Domain
              </label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="cyber-input w-full"
                data-testid="select-domain"
              >
                {domains.map((domain) => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            </div>
          )}
          
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="cyber-btn cyber-btn-primary w-full flex items-center justify-center gap-2"
            data-testid="btn-generate"
          >
            {generating ? (
              <>
                <div className="spinner" />
                <span>GENERATING...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>GENERATE EMAIL</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Active Emails List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="cyber-card"
      >
        <div className="cyber-card-header">
          <div className="terminal-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 tracking-widest uppercase">Active Emails</span>
            <button 
              onClick={loadEmails}
              className="text-gray-400 hover:text-neon-green transition-colors"
              data-testid="btn-refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="spinner" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">NO ACTIVE EMAILS</p>
              <p className="text-xs mt-1">Generate one above to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between p-4 border border-neon-green/10 hover:border-neon-green/30 hover:bg-neon-green/5 transition-all group"
                  data-testid={`email-item-${email.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-neon-green shrink-0" />
                      <span className="text-neon-green font-medium truncate">
                        {email.email_address}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {email.expires_at 
                          ? `Expires: ${new Date(email.expires_at).toLocaleString()}`
                          : 'No expiration'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleCopy(email.email_address)}
                      className="p-2 text-gray-400 hover:text-neon-blue transition-colors"
                      title="Copy email"
                      data-testid={`btn-copy-${email.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/inbox/${email.id}`)}
                      className="p-2 text-gray-400 hover:text-neon-green transition-colors"
                      title="View inbox"
                      data-testid={`btn-inbox-${email.id}`}
                    >
                      <Inbox className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(email.id)}
                      className="p-2 text-gray-400 hover:text-neon-pink transition-colors"
                      title="Delete email"
                      data-testid={`btn-delete-${email.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-neon-green transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid md:grid-cols-3 gap-4"
      >
        {[
          { 
            icon: Shield, 
            title: "ANONYMOUS", 
            desc: "No registration required. Complete privacy.",
            color: "neon-green"
          },
          { 
            icon: Bot, 
            title: "TELEGRAM BOT", 
            desc: "Generate & receive emails via Telegram.",
            color: "neon-blue"
          },
          { 
            icon: Zap, 
            title: "INSTANT", 
            desc: "Real-time email forwarding and notifications.",
            color: "neon-green"
          },
        ].map((feature, i) => (
          <div 
            key={feature.title}
            className="cyber-card p-6 text-center hover:border-neon-green/40 transition-all"
            data-testid={`feature-${feature.title.toLowerCase()}`}
          >
            <feature.icon className={`w-8 h-8 text-${feature.color} mx-auto mb-3`} />
            <h3 className={`text-${feature.color} font-bold tracking-wider mb-2`}>{feature.title}</h3>
            <p className="text-gray-500 text-xs">{feature.desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Telegram Bot Info */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="cyber-card border-neon-blue/30"
      >
        <div className="cyber-card-header border-neon-blue/20 bg-neon-blue/5">
          <div className="terminal-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="text-xs text-neon-blue tracking-widest uppercase">Telegram Bot Commands</span>
        </div>
        
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            {[
              { cmd: "/start", desc: "Initialize bot & register" },
              { cmd: "/generate [prefix]", desc: "Create new temp email" },
              { cmd: "/list", desc: "Show your active emails" },
              { cmd: "/inbox", desc: "Check current inbox" },
              { cmd: "/delete [id]", desc: "Delete a temp email" },
              { cmd: "/send to | subject | body", desc: "Send an email" },
            ].map((item) => (
              <div key={item.cmd} className="flex items-start gap-3">
                <code className="text-neon-blue bg-neon-blue/10 px-2 py-1 text-xs shrink-0">
                  {item.cmd}
                </code>
                <span className="text-gray-400 text-xs">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HomePage;
