import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Download,
  Paperclip,
  Clock,
  User,
  Mail,
  FileText,
  Image,
  File
} from "lucide-react";
import { toast } from "sonner";
import { getMessage } from "../lib/api";

const EmailDetailPage = () => {
  const { messageId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadEmail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMessage(messageId);
      setEmail(data);
    } catch (error) {
      toast.error("Failed to load email");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [messageId, navigate]);

  useEffect(() => {
    loadEmail();
  }, [loadEmail]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return Image;
    }
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      return FileText;
    }
    return File;
  };

  const downloadAttachment = (attachment) => {
    if (attachment.content) {
      try {
        const byteCharacters = atob(attachment.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: attachment.content_type || 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.filename || 'attachment';
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        toast.error("Failed to download attachment");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="spinner" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Email not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-400 hover:text-neon-green transition-colors"
          data-testid="btn-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display uppercase tracking-wider text-neon-green text-glow">
          Email
        </h1>
      </motion.div>

      {/* Email Content */}
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
          <span className="text-xs text-gray-400 tracking-widest">MESSAGE DETAILS</span>
        </div>

        {/* Email Header Info */}
        <div className="p-6 border-b border-neon-green/10 space-y-4">
          <h2 className="text-xl text-gray-200 font-medium" data-testid="email-subject">
            {email.subject}
          </h2>
          
          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-neon-green shrink-0" />
              <span className="text-gray-500 uppercase text-xs w-16">From:</span>
              <span className="text-gray-300">
                {email.from_name && <span className="font-medium">{email.from_name}</span>}
                {email.from_name && ' '}
                <span className="text-neon-blue">&lt;{email.from_address}&gt;</span>
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-neon-green shrink-0" />
              <span className="text-gray-500 uppercase text-xs w-16">To:</span>
              <span className="text-neon-green">{email.to_address}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-neon-green shrink-0" />
              <span className="text-gray-500 uppercase text-xs w-16">Date:</span>
              <span className="text-gray-400">{formatDate(email.received_at)}</span>
            </div>
          </div>
        </div>

        {/* Attachments */}
        {email.attachments?.length > 0 && (
          <div className="p-4 border-b border-neon-green/10 bg-neon-green/5">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-4 h-4 text-neon-green" />
              <span className="text-xs text-gray-400 uppercase tracking-widest">
                {email.attachments.length} Attachment{email.attachments.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((attachment, index) => {
                const FileIcon = getFileIcon(attachment.filename);
                return (
                  <button
                    key={index}
                    onClick={() => downloadAttachment(attachment)}
                    className="flex items-center gap-2 px-3 py-2 border border-neon-green/30 hover:border-neon-green hover:bg-neon-green/10 transition-all text-sm"
                    data-testid={`attachment-${index}`}
                  >
                    <FileIcon className="w-4 h-4 text-neon-green" />
                    <span className="text-gray-300 max-w-[150px] truncate">
                      {attachment.filename || 'attachment'}
                    </span>
                    <Download className="w-3 h-3 text-gray-500" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Email Body */}
        <div className="p-6">
          {email.body_html ? (
            <div 
              className="email-content text-gray-300 prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: email.body_html }}
              data-testid="email-body-html"
            />
          ) : email.body_text ? (
            <pre 
              className="text-gray-300 whitespace-pre-wrap font-mono text-sm"
              data-testid="email-body-text"
            >
              {email.body_text}
            </pre>
          ) : (
            <p className="text-gray-500 italic">No content available</p>
          )}
        </div>
      </motion.div>

      {/* Telegram Forward Status */}
      {email.forwarded_to_telegram && (
        <div className="text-center text-xs text-gray-600">
          <span className="cyber-badge cyber-badge-success">
            FORWARDED TO TELEGRAM
          </span>
        </div>
      )}
    </div>
  );
};

export default EmailDetailPage;
