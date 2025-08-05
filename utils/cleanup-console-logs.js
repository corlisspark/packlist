// Console Log Cleanup Utility
// Helps identify and replace console.log statements with proper error handling

class ConsoleLogCleanup {
  constructor() {
    this.patterns = {
      // Common console.log patterns
      simpleLog: /console\.log\(['"`]([^'"`]+)['"`]\);?/g,
      variableLog: /console\.log\(([^)]+)\);?/g,
      
      // Error patterns  
      consoleError: /console\.error\(['"`]([^'"`]+)['"`](?:,\s*([^)]+))?\);?/g,
      consoleWarn: /console\.warn\(['"`]([^'"`]+)['"`](?:,\s*([^)]+))?\);?/g,
      
      // Debug patterns
      debugLog: /console\.log\(['"`].*debug.*['"`](?:,\s*([^)]+))?\);?/gi,
      initLog: /console\.log\(['"`].*initializ.*['"`](?:,\s*([^)]+))?\);?/gi,
    };
  }

  // Generate replacement suggestions for console.log statements
  generateReplacements(logStatement) {
    const replacements = [];

    // Check for error patterns
    if (logStatement.includes('error') || logStatement.includes('Error')) {
      replacements.push({
        type: 'error',
        replacement: `if (window.errorHandler) {\n      window.errorHandler.handleError(error, 'Context');\n    } else {\n      ${logStatement}\n    }`
      });
    }

    // Check for debug patterns
    if (logStatement.includes('debug') || logStatement.includes('Debug')) {
      replacements.push({
        type: 'debug',
        replacement: `if (window.errorHandler) {\n      window.errorHandler.debug('Message');\n    }`
      });
    }

    // Check for initialization patterns
    if (logStatement.includes('initializ') || logStatement.includes('Initializ')) {
      replacements.push({
        type: 'info',
        replacement: `if (window.errorHandler) {\n      window.errorHandler.info('Initialization message');\n    }`
      });
    }

    // Check for warning patterns
    if (logStatement.includes('warn') || logStatement.includes('Warn')) {
      replacements.push({
        type: 'warn',
        replacement: `if (window.errorHandler) {\n      window.errorHandler.warn('Warning message');\n    }`
      });
    }

    // Default comment replacement
    replacements.push({
      type: 'comment',
      replacement: `// ${logStatement.replace(/console\.log\(['"`]?|['"`]?\);?/g, '').trim()}`
    });

    return replacements;
  }

  // Analyze file for console statements
  analyzeFile(fileContent, filename) {
    const analysis = {
      filename,
      totalConsoleStatements: 0,
      byType: {
        log: 0,
        error: 0,  
        warn: 0,
        info: 0,
        debug: 0
      },
      statements: [],
      suggestions: []
    };

    // Find all console statements
    const consoleRegex = /console\.(log|error|warn|info|debug)\([^)]*\);?/g;
    let match;

    while ((match = consoleRegex.exec(fileContent)) !== null) {
      const statement = match[0];
      const type = match[1];
      const lineNumber = fileContent.substring(0, match.index).split('\n').length;

      analysis.totalConsoleStatements++;
      analysis.byType[type]++;
      
      analysis.statements.push({
        statement,
        type,
        lineNumber,
        context: this.getContext(fileContent, match.index)
      });

      // Generate suggestions
      const suggestions = this.generateReplacements(statement);
      analysis.suggestions.push({
        lineNumber,
        original: statement,
        suggestions
      });
    }

    return analysis;
  }

  // Get context around console statement
  getContext(content, index) {
    const lines = content.split('\n');
    const lineIndex = content.substring(0, index).split('\n').length - 1;
    
    const contextLines = [];
    for (let i = Math.max(0, lineIndex - 2); i <= Math.min(lines.length - 1, lineIndex + 2); i++) {
      contextLines.push({
        lineNumber: i + 1,
        content: lines[i],
        isTarget: i === lineIndex
      });
    }
    
    return contextLines;
  }

  // Generate cleanup report
  generateCleanupReport(analyses) {
    const report = {
      totalFiles: analyses.length,
      totalStatements: analyses.reduce((sum, a) => sum + a.totalConsoleStatements, 0),
      byType: {
        log: analyses.reduce((sum, a) => sum + a.byType.log, 0),
        error: analyses.reduce((sum, a) => sum + a.byType.error, 0),
        warn: analyses.reduce((sum, a) => sum + a.byType.warn, 0),
        info: analyses.reduce((sum, a) => sum + a.byType.info, 0),
        debug: analyses.reduce((sum, a) => sum + a.byType.debug, 0)
      },
      priorityFiles: analyses
        .filter(a => a.totalConsoleStatements > 10)
        .sort((a, b) => b.totalConsoleStatements - a.totalConsoleStatements),
      recommendations: this.generateRecommendations(analyses)
    };

    return report;
  }

  // Generate cleanup recommendations
  generateRecommendations(analyses) {
    const recommendations = [];

    // High priority files
    const highPriorityFiles = analyses.filter(a => a.totalConsoleStatements > 20);
    if (highPriorityFiles.length > 0) {
      recommendations.push({
        type: 'high_priority',
        message: `${highPriorityFiles.length} files have >20 console statements and should be prioritized`,
        files: highPriorityFiles.map(f => f.filename)
      });
    }

    // Error handling opportunities
    const errorFiles = analyses.filter(a => a.byType.error > 5);
    if (errorFiles.length > 0) {
      recommendations.push({
        type: 'error_handling',
        message: `${errorFiles.length} files have >5 console.error statements that should use centralized error handling`,
        files: errorFiles.map(f => f.filename)
      });
    }

    // Debug cleanup opportunities
    const debugFiles = analyses.filter(a => a.byType.debug > 10);
    if (debugFiles.length > 0) {
      recommendations.push({
        type: 'debug_cleanup',
        message: `${debugFiles.length} files have >10 debug statements that could be cleaned up`,
        files: debugFiles.map(f => f.filename)
      });
    }

    return recommendations;
  }

  // Export cleanup report
  exportReport(report) {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: report.totalFiles,
        totalStatements: report.totalStatements,
        byType: report.byType
      },
      priorityFiles: report.priorityFiles,
      recommendations: report.recommendations,
      detailedAnalysis: report
    };

    console.log('Console Log Cleanup Report');
    console.log('=========================');
    console.log(`Total files analyzed: ${report.totalFiles}`);
    console.log(`Total console statements: ${report.totalStatements}`);
    console.log('\nBreakdown by type:');
    Object.entries(report.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\nPriority files (>10 statements):');
    report.priorityFiles.slice(0, 10).forEach(file => {
      console.log(`  ${file.filename}: ${file.totalConsoleStatements} statements`);
    });

    console.log('\nRecommendations:');
    report.recommendations.forEach(rec => {
      console.log(`  - ${rec.message}`);
    });

    return reportData;
  }
}

// Usage example for browser environment
if (typeof window !== 'undefined') {
  window.ConsoleLogCleanup = ConsoleLogCleanup;
  
  // Helper function to analyze current page
  window.analyzePageConsoleStatements = function() {
    const cleanup = new ConsoleLogCleanup();
    const scripts = Array.from(document.scripts);
    const analyses = [];
    
    scripts.forEach(script => {
      if (script.src && script.textContent) {
        const analysis = cleanup.analyzeFile(script.textContent, script.src);
        analyses.push(analysis);
      }
    });
    
    const report = cleanup.generateCleanupReport(analyses);
    return cleanup.exportReport(report);
  };
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConsoleLogCleanup;
}