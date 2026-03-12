import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Mail, 
  ArrowLeft, 
  RefreshCw, 
  Copy,
  Send,
  Paperclip,
  Clock,
  User,
  ChevronRight,
  Inbox as InboxIcon
} from "lucide-react";
import { toast } from "sonner";
import { getInbox, sendEmail } from "../lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";

const InboxPage = () => {
  const { emailId } = useParams();
  const navigate = useNavigate();
  const [inbox, setInbox] = useState([]);
  const [tempEmail, setTempEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
  });

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInbox(emailId);
      setInbox(data.inbox || []);
      setTempEmail(data.temp_email);
    } catch (error) {
      toast.error("Failed to load inbox");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [emailId, navigate]);

  useEffect(() => {
    loadInbox();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadInbox, 30000);
    return () => clearInterval(interval);
  }, [loadInbox]);

  const handleCopy = async () => {
    if (tempEmail) {
      try {
        await navigator.clipboard.writeText(tempEmail.email_address);
        toast.success("Email copied to clipboard");
      } catch (error) {
        // Fallback for browsers without clipboard API permission
        const textArea = document.createElement("textarea");
        textArea.value = tempEmail.email_address;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          toast.success("Email copied to clipboard");
        } catch (err) {
          toast.error("Failed to copy to clipboard");
        }
        document.body.removeChild(textArea);
      }
    }
  };

  const handleSend = async () => {
    if (!composeData.to || !composeData.subject || !composeData.body) {
      toast.error("Please fill all fields");
      return;
    }

    setComposing(true);
    try {
      await sendEmail({
        from_email_id: emailId,
        to_email: composeData.to,
        subject: composeData.subject,
        body_html: `<p>${composeData.body.replace(/\n/g, '<br>')}</p>`,
      });
      toast.success("Email sent successfully");
      setComposeOpen(false);
      setComposeData({ to: "", subject: "", body: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send email");
    } finally {
      setComposing(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 text-gray-400 hover:text-neon-green transition-colors"
            data-testid="btn-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-display uppercase tracking-wider text-neon-green text-glow">
              Inbox
            </h1>
            {tempEmail && (
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm text-gray-400">{tempEmail.email_address}</code>
                <button
                  onClick={handleCopy}
                  className="text-gray-500 hover:text-neon-blue transition-colors"
                  data-testid="btn-copy-email"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadInbox}
            className="cyber-btn flex items-center gap-2"
            data-testid="btn-refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <button
                className="cyber-btn cyber-btn-primary flex items-center gap-2"
                data-testid="btn-compose"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Compose</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-cyber-gray border border-neon-green/30 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-neon-green font-display uppercase tracking-wider">
                  Compose Email
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                    To
                  </label>
                  <input
                    type="email"
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    placeholder="recipient@example.com"
                    className="cyber-input w-full"
                    data-testid="input-to"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="Email subject"
                    className="cyber-input w-full"
                    data-testid="input-subject"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                    Message
                  </label>
                  <textarea
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                    placeholder="Type your message..."
                    rows={6}
                    className="cyber-input w-full resize-none"
                    data-testid="input-body"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={composing}
                  className="cyber-btn cyber-btn-primary w-full flex items-center justify-center gap-2"
                  data-testid="btn-send"
                >
                  {composing ? (
                    <>
                      <div className="spinner" />
                      <span>SENDING...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>SEND EMAIL</span>
                    </>
                  )}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Inbox List */}
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
          <span className="text-xs text-gray-400 tracking-widest">
            {inbox.length} MESSAGE{inbox.length !== 1 ? 'S' : ''}
          </span>
        </div>

        <div className="divide-y divide-neon-green/10">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="spinner" />
            </div>
          ) : inbox.length === 0 ? (
            <div className="text-center py-16">
              <InboxIcon className="w-16 h-16 mx-auto mb-4 text-gray-700" />
              <p className="text-gray-500 text-sm uppercase tracking-wider">Inbox Empty</p>
              <p className="text-gray-600 text-xs mt-2">
                Emails sent to {tempEmail?.email_address} will appear here
              </p>
            </div>
          ) : (
            inbox.map((email) => (
              <Link
                key={email.id}
                to={`/email/${email.id}`}
                className={`block p-4 hover:bg-neon-green/5 transition-all group ${
                  !email.is_read ? 'border-l-2 border-neon-green' : ''
                }`}
                data-testid={`email-message-${email.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-neon-green shrink-0" />
                      <span className={`text-sm truncate ${!email.is_read ? 'text-neon-green font-semibold' : 'text-gray-300'}`}>
                        {email.from_name || email.from_address}
                      </span>
                      {!email.is_read && (
                        <span className="cyber-badge cyber-badge-success text-[8px]">NEW</span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${!email.is_read ? 'text-gray-200' : 'text-gray-400'}`}>
                      {email.subject}
                    </p>
                    <p className="text-xs text-gray-600 truncate mt-1">
                      {email.body_text?.slice(0, 100) || 'No preview available'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    {email.attachments?.length > 0 && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Paperclip className="w-3 h-3" />
                        <span className="text-xs">{email.attachments.length}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{formatDate(email.received_at)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-neon-green transition-colors" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </motion.div>

      {/* Auto-refresh notice */}
      <div className="text-center text-xs text-gray-600">
        <Clock className="w-3 h-3 inline mr-1" />
        Auto-refreshing every 30 seconds
      </div>
    </div>
  );
};

export default InboxPage;
