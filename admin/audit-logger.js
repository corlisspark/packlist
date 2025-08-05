// Audit Logging System for PacksList Admin
// Tracks all admin actions and system events for security and compliance

class AuditLogger {
  constructor() {
    this.logLevels = ['info', 'warning', 'error', 'critical'];
    this.retentionDays = 90; // Keep logs for 90 days
  }

  // Initialize audit logging
  initialize() {
    console.log('Audit logging system initialized');
    this.setupLogCleanup();
  }

  // Log admin action with context
  async logAction(action, details = {}) {
    try {
      const logEntry = {
        action,
        details,
        level: 'info',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        adminId: window.authManager?.currentUser?.uid,
        adminEmail: window.authManager?.currentUser?.email,
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        ip: await this.getClientIP(),
        location: window.location.pathname
      };

      await window.db.collection('audit_logs').add(logEntry);
      
      console.log(`Audit log: ${action}`, details);
      
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  }

  // Log security event
  async logSecurityEvent(event, level = 'warning', details = {}) {
    try {
      const logEntry = {
        action: 'security_event',
        event,
        details,
        level,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userId: window.authManager?.currentUser?.uid,
        userAgent: navigator.userAgent,
        ip: await this.getClientIP()
      };

      await window.db.collection('security_logs').add(logEntry);
      
      if (level === 'critical') {
        await this.alertAdministrators(event, details);
      }
      
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // Log system error
  async logError(error, context = {}) {
    try {
      const logEntry = {
        action: 'system_error',
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        context,
        level: 'error',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userId: window.authManager?.currentUser?.uid,
        userAgent: navigator.userAgent
      };

      await window.db.collection('error_logs').add(logEntry);
      
    } catch (logError) {
      console.error('Error logging system error:', logError);
    }
  }

  // Get session ID (create if doesn't exist)
  getSessionId() {
    let sessionId = sessionStorage.getItem('admin_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('admin_session_id', sessionId);
    }
    return sessionId;
  }

  // Get client IP (simplified - would need server-side support)
  async getClientIP() {
    try {
      // This is a placeholder - in production, you'd get this from your server
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  // Alert administrators of critical events
  async alertAdministrators(event, details) {
    try {
      // In production, this would send emails or push notifications
      console.warn('CRITICAL SECURITY EVENT:', event, details);
      
      // Store alert in database
      await window.db.collection('security_alerts').add({
        event,
        details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        resolved: false
      });
      
    } catch (error) {
      console.error('Error alerting administrators:', error);
    }
  }

  // Set up automatic log cleanup
  setupLogCleanup() {
    // In production, this would be handled by a server-side cron job
    console.log('Log cleanup scheduled (would run server-side in production)');
  }

  // Get recent audit logs
  async getRecentLogs(limit = 50, level = 'all') {
    try {
      let query = window.db
        .collection('audit_logs')
        .orderBy('timestamp', 'desc')
        .limit(limit);
      
      if (level !== 'all') {
        query = query.where('level', '==', level);
      }
      
      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      
    } catch (error) {
      console.error('Error getting recent logs:', error);
      return [];
    }
  }

  // Export logs for compliance
  async exportLogs(startDate, endDate, format = 'json') {
    try {
      const logs = await this.getLogsByDateRange(startDate, endDate);
      
      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else if (format === 'csv') {
        return this.convertLogsToCSV(logs);
      }
      
      return logs;
      
    } catch (error) {
      console.error('Error exporting logs:', error);
      return null;
    }
  }

  // Get logs by date range
  async getLogsByDateRange(startDate, endDate) {
    try {
      const snapshot = await window.db
        .collection('audit_logs')
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .orderBy('timestamp', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      
    } catch (error) {
      console.error('Error getting logs by date range:', error);
      return [];
    }
  }

  // Convert logs to CSV format
  convertLogsToCSV(logs) {
    if (logs.length === 0) return '';
    
    const headers = ['timestamp', 'action', 'level', 'adminEmail', 'details'];
    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
      const row = [
        log.timestamp?.toISOString() || '',
        log.action || '',
        log.level || '',
        log.adminEmail || '',
        JSON.stringify(log.details || {}).replace(/"/g, '""')
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
}

// Initialize audit logger
document.addEventListener('DOMContentLoaded', () => {
  window.auditLogger = new AuditLogger();
  window.auditLogger.initialize();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuditLogger;
}