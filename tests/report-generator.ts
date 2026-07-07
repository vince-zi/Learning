/**
 * HTML Report Generator
 * Generates a validation report similar to the original format
 */

import fs from 'fs';
import path from 'path';

interface AssertionResult {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
}

interface TestLog {
  step: string;
  type: string;
  status: string;
  data?: any;
}

export class ReportGenerator {
  private logs: TestLog[] = [];
  private assertions: AssertionResult[] = [];
  private startTime: number = Date.now();

  log(step: string, type: string, status: string, data?: any) {
    this.logs.push({ step, type, status, data });
  }

  addAssertion(result: AssertionResult) {
    this.assertions.push(result);
  }

  generateHTML(): string {
    const passedCount = this.assertions.filter(a => a.passed).length;
    const failedCount = this.assertions.filter(a => !a.passed).length;
    const totalCount = this.assertions.length;
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
    const executionTime = Date.now() - this.startTime;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Learniny System Core Flow Validation Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-value {
            font-size: 3rem;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9rem;
        }
        
        .mode-section {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .mode-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .mode-title {
            font-size: 1.5rem;
            color: #333;
        }
        
        .mode-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .badge-online {
            background: #fef3c7;
            color: #92400e;
        }
        
        .badge-offline {
            background: #d1fae5;
            color: #065f46;
        }
        
        .log-entry {
            background: #f9fafb;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
            border-left: 4px solid #e5e7eb;
        }
        
        .log-entry.pass {
            border-left-color: #10b981;
        }
        
        .log-entry.fail {
            border-left-color: #ef4444;
        }
        
        .log-entry.info {
            border-left-color: #3b82f6;
        }
        
        .log-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        
        .log-step {
            font-weight: 600;
            color: #111827;
        }
        
        .log-status {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-pass {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-fail {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .status-info {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .log-data {
            background: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            overflow-x: auto;
            color: #374151;
        }
        
        .assertion-box {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin-top: 10px;
        }
        
        .assertion-row {
            display: flex;
            gap: 20px;
            margin-bottom: 8px;
        }
        
        .assertion-label {
            font-weight: 600;
            color: #6b7280;
            min-width: 80px;
        }
        
        .assertion-value {
            color: #111827;
            font-family: 'Courier New', monospace;
        }
        
        .footer {
            text-align: center;
            color: white;
            margin-top: 40px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Learniny System 核心流验证报告</h1>
            <p>自动化执行并比对：[练习与诊断模式] (DeepSeek LLM 驱动) vs [温习与消灭模式] (100% 本地离线引擎)</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${passRate}%</div>
                <div class="stat-label">验证通过率 (Assert Pass Rate)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${passedCount}</div>
                <div class="stat-label">通过断言 (Passed Asserts)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${failedCount}</div>
                <div class="stat-label">失败断言 (Failed Asserts)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalCount}</div>
                <div class="stat-label">断言总数 (Total Asserts)</div>
            </div>
        </div>
        
        ${this.generateModeSection('1. 练习与诊断模式 (Practice & Diagnosis)', 'Online LLM', 'online')}
        ${this.generateModeSection('2. 温习与错题消灭模式 (Review & Elimination)', '100% Local Offline', 'offline')}
        
        <div class="footer">
            <p>Learniny System Core Pipeline Validator © ${new Date().getFullYear()}. Run successfully in ${executionTime}ms.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateModeSection(title: string, badge: string, mode: 'online' | 'offline'): string {
    return `
        <div class="mode-section">
            <div class="mode-header">
                <div class="mode-title">${title}</div>
                <div class="mode-badge badge-${mode}">${badge}</div>
            </div>
            ${this.logs.map(log => this.generateLogEntry(log)).join('')}
        </div>
    `;
  }

  private generateLogEntry(log: TestLog): string {
    const statusClass = log.status === 'PASS' ? 'pass' : log.status === 'FAIL' ? 'fail' : 'info';
    const statusBadgeClass = log.status === 'PASS' ? 'status-pass' : log.status === 'FAIL' ? 'status-fail' : 'status-info';

    return `
        <div class="log-entry ${statusClass}">
            <div class="log-header">
                <div class="log-step">${log.step}</div>
                <div class="log-status ${statusBadgeClass}">${log.status}</div>
            </div>
            ${log.data ? `<div class="log-data">${this.formatData(log.data)}</div>` : ''}
            ${this.generateAssertionBox(log.step)}
        </div>
    `;
  }

  private generateAssertionBox(step: string): string {
    const assertion = this.assertions.find(a => a.name === step);
    if (!assertion) return '';

    return `
        <div class="assertion-box">
            <div class="assertion-row">
                <div class="assertion-label">Expected</div>
                <div class="assertion-value">${this.formatValue(assertion.expected)}</div>
            </div>
            <div class="assertion-row">
                <div class="assertion-label">Actual</div>
                <div class="assertion-value">${this.formatValue(assertion.actual)}</div>
            </div>
        </div>
    `;
  }

  private formatData(data: any): string {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  }

  private formatValue(value: any): string {
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  saveReport(filename: string = 'validation-report.html') {
    const html = this.generateHTML();
    const filepath = path.resolve(process.cwd(), filename);
    fs.writeFileSync(filepath, html, 'utf-8');
    console.log(`\n📄 Report saved to: ${filepath}`);
  }
}
